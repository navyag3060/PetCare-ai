from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from config import Config
from models import db, User, Pet, Medication, CommunityPost
from rag_chain import initialize_rag_chain
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app with static folder configuration
app = Flask(__name__, 
            static_folder='../frontend',  # Point to frontend directory
            static_url_path='')            # Remove '/static' prefix from URLs

# Configuration
app.config.from_object(Config)

# CORS configuration with credentials support
CORS(app, 
     supports_credentials=True,
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Initialize database
db.init_app(app)

# Initialize RAG chain
print("\n" + "="*60)
print("Initializing PawCare AI RAG System...")
print("="*60)
qa_chain = initialize_rag_chain()

# Create database tables
with app.app_context():
    db.create_all()
    print("✓ Database tables created successfully")

# ============ Frontend Serving Routes ============

@app.route('/')
def serve_index():
    """Serve the main index.html page"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/dashboard.html')
def serve_dashboard():
    """Serve the dashboard.html page"""
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/<path:path>')
def serve_static_files(path):
    """Serve all other static files (CSS, JS, images, etc.)"""
    try:
        return send_from_directory(app.static_folder, path)
    except Exception as e:
        return jsonify({"error": "File not found"}), 404

# ============ Health Check Endpoint ============

@app.route("/api/health", methods=["GET"])
def health_check():
    """API health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "PawCare AI API",
        "rag_initialized": qa_chain is not None,
        "database": "connected"
    })

# ============ Authentication Endpoints ============

@app.route("/api/register", methods=["POST"])
def register():
    """Register a new user"""
    try:
        data = request.json
        
        # Validate input
        if not data.get('username') or not data.get('email'):
            return jsonify({"error": "Username and email are required"}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Username already exists"}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email already exists"}), 400
        
        # Create new user
        user = User(username=data['username'], email=data['email'])
        db.session.add(user)
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        
        print(f"✓ New user registered: {user.username}")
        return jsonify(user.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/login", methods=["POST"])
def login():
    """Login existing user"""
    try:
        data = request.json
        
        if not data.get('username'):
            return jsonify({"error": "Username is required"}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Set session
        session['user_id'] = user.id
        
        print(f"✓ User logged in: {user.username}")
        return jsonify(user.to_dict())
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/logout", methods=["POST"])
def logout():
    """Logout current user"""
    user_id = session.get('user_id')
    if user_id:
        user = User.query.get(user_id)
        if user:
            print(f"✓ User logged out: {user.username}")
    
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"})


@app.route("/api/current-user", methods=["GET"])
def current_user():
    """Get current logged-in user"""
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.to_dict())


# ============ Pet Profile Endpoints ============

@app.route("/api/pets", methods=["GET", "POST"])
def pets():
    """Get all pets or create new pet"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - Please login"}), 401
    
    try:
        if request.method == "GET":
            user_pets = Pet.query.filter_by(user_id=session['user_id']).all()
            return jsonify([pet.to_dict() for pet in user_pets])
        
        if request.method == "POST":
            data = request.json
            
            # Validate required fields
            if not data.get('name') or not data.get('species'):
                return jsonify({"error": "Name and species are required"}), 400
            
            pet = Pet(
                name=data['name'],
                species=data['species'],
                breed=data.get('breed'),
                age=data.get('age'),
                weight=data.get('weight'),
                medical_notes=data.get('medical_notes'),
                dietary_preferences=data.get('dietary_preferences'),
                user_id=session['user_id']
            )
            db.session.add(pet)
            db.session.commit()
            
            print(f"✓ Pet added: {pet.name} ({pet.species})")
            return jsonify(pet.to_dict()), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Pet operation error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/pets/<int:pet_id>", methods=["GET", "PUT", "DELETE"])
def pet_detail(pet_id):
    """Get, update, or delete a specific pet"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        pet = Pet.query.get_or_404(pet_id)
        
        # Check ownership
        if pet.user_id != session['user_id']:
            return jsonify({"error": "Forbidden - Not your pet"}), 403
        
        if request.method == "GET":
            return jsonify(pet.to_dict())
        
        if request.method == "PUT":
            data = request.json
            
            # Update pet fields
            for key, value in data.items():
                if hasattr(pet, key) and key not in ['id', 'user_id', 'created_at']:
                    setattr(pet, key, value)
            
            db.session.commit()
            print(f"✓ Pet updated: {pet.name}")
            return jsonify(pet.to_dict())
        
        if request.method == "DELETE":
            pet_name = pet.name
            db.session.delete(pet)
            db.session.commit()
            print(f"✓ Pet deleted: {pet_name}")
            return jsonify({"message": "Pet deleted successfully"})
            
    except Exception as e:
        db.session.rollback()
        print(f"Pet detail error: {e}")
        return jsonify({"error": str(e)}), 500


# ============ Medication Endpoints ============

@app.route("/api/pets/<int:pet_id>/medications", methods=["GET", "POST"])
def medications(pet_id):
    """Get all medications or add new medication for a pet"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        pet = Pet.query.get_or_404(pet_id)
        
        # Check ownership
        if pet.user_id != session['user_id']:
            return jsonify({"error": "Forbidden"}), 403
        
        if request.method == "GET":
            return jsonify([med.to_dict() for med in pet.medications])
        
        if request.method == "POST":
            data = request.json
            
            if not data.get('name'):
                return jsonify({"error": "Medication name is required"}), 400
            
            med = Medication(
                name=data['name'],
                dosage=data.get('dosage'),
                frequency=data.get('frequency'),
                time_of_day=data.get('time_of_day'),
                notes=data.get('notes'),
                pet_id=pet_id
            )
            db.session.add(med)
            db.session.commit()
            
            print(f"✓ Medication added: {med.name} for {pet.name}")
            return jsonify(med.to_dict()), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Medication error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/medications/<int:med_id>", methods=["PUT", "DELETE"])
def medication_detail(med_id):
    """Update or delete a specific medication"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        med = Medication.query.get_or_404(med_id)
        pet = Pet.query.get(med.pet_id)
        
        # Check ownership
        if pet.user_id != session['user_id']:
            return jsonify({"error": "Forbidden"}), 403
        
        if request.method == "PUT":
            data = request.json
            
            for key, value in data.items():
                if hasattr(med, key) and key not in ['id', 'pet_id', 'created_at']:
                    setattr(med, key, value)
            
            db.session.commit()
            print(f"✓ Medication updated: {med.name}")
            return jsonify(med.to_dict())
        
        if request.method == "DELETE":
            med_name = med.name
            db.session.delete(med)
            db.session.commit()
            print(f"✓ Medication deleted: {med_name}")
            return jsonify({"message": "Medication deleted successfully"})
            
    except Exception as e:
        db.session.rollback()
        print(f"Medication detail error: {e}")
        return jsonify({"error": str(e)}), 500


# ============ Community Endpoints ============

@app.route("/api/community", methods=["GET", "POST"])
def community():
    """Get all community posts or create new post"""
    try:
        if request.method == "GET":
            posts = CommunityPost.query.order_by(
                CommunityPost.created_at.desc()
            ).limit(50).all()
            return jsonify([post.to_dict() for post in posts])
        
        if request.method == "POST":
            if 'user_id' not in session:
                return jsonify({"error": "Unauthorized - Please login to post"}), 401
            
            data = request.json
            
            if not data.get('title') or not data.get('content'):
                return jsonify({"error": "Title and content are required"}), 400
            
            post = CommunityPost(
                title=data['title'],
                content=data['content'],
                post_type=data.get('post_type', 'experience'),
                user_id=session['user_id']
            )
            db.session.add(post)
            db.session.commit()
            
            print(f"✓ Community post created: {post.title}")
            return jsonify(post.to_dict()), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Community error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/community/<int:post_id>", methods=["DELETE"])
def delete_community_post(post_id):
    """Delete a community post"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        post = CommunityPost.query.get_or_404(post_id)
        
        # Check ownership
        if post.user_id != session['user_id']:
            return jsonify({"error": "Forbidden - Not your post"}), 403
        
        post_title = post.title
        db.session.delete(post)
        db.session.commit()
        
        print(f"✓ Community post deleted: {post_title}")
        return jsonify({"message": "Post deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print(f"Delete post error: {e}")
        return jsonify({"error": str(e)}), 500


# ============ RAG Chatbot Endpoint ============

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chat endpoint with RAG-based responses.
    Requires authentication and includes user context.
    """
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({
            "error": "Unauthorized - Please login to use the chatbot",
            "answer": "Please login to chat with PawCare AI. 🔒"
        }), 401
    
    try:
        data = request.json
        user_input = data.get("message", "").strip()
        
        if not user_input:
            return jsonify({"error": "Message cannot be empty"}), 400
        
        # Build user context
        context_prefix = ""
        try:
            user = User.query.get(session['user_id'])
            pets = Pet.query.filter_by(user_id=session['user_id']).all()
            
            if pets:
                pet_details = []
                for p in pets:
                    details = f"{p.name} (a {p.age if p.age else 'unknown age'} year old {p.species}"
                    if p.breed:
                        details += f", {p.breed}"
                    details += ")"
                    pet_details.append(details)
                
                context_prefix = f"User's pets: {', '.join(pet_details)}. "
                print(f"📝 Chat context: User has {len(pets)} pet(s)")
        except Exception as e:
            print(f"Error getting user context: {e}")
        
        # Enhance query with context
        enhanced_query = context_prefix + user_input
        
        print(f"💬 Chat query from user {session['user_id']}: {user_input[:50]}...")
        
        # Invoke the RAG chain
        response = qa_chain.invoke({"input": enhanced_query})
        
        # Extract answer and sources
        answer = response.get("answer", "I'm sorry, I couldn't generate a response.")
        sources = response.get("context", [])
        
        # Format source information
        source_info = []
        for doc in sources[:2]:  # Limit to 2 sources
            source_info.append({
                "content": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", "N/A")
            })
        
        print(f"✓ Response generated successfully")
        
        return jsonify({
            "answer": answer,
            "sources": source_info
        })
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "An error occurred processing your request",
            "answer": "I apologize, but I'm having trouble processing your question right now. Please try again."
        }), 500


# ============ Error Handlers ============

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    return jsonify({"error": "Internal server error"}), 500


@app.errorhandler(403)
def forbidden(e):
    """Handle 403 errors"""
    return jsonify({"error": "Forbidden"}), 403


# ============ Run Application ============

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🐾 PawCare AI Server Starting...")
    print("="*60)
    
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️  WARNING: OPENAI_API_KEY not found!")
        print("Please create a .env file with:")
        print("OPENAI_API_KEY=your_key_here\n")
    else:
        print("✓ OpenAI API key configured")
    
    # Check if data folder exists
    if not os.path.exists("data"):
        print("\n⚠️  WARNING: 'data' folder not found!")
        print("Please create a 'data' folder and add your PDF files\n")
    else:
        pdf_files = [f for f in os.listdir("data") if f.endswith('.pdf')]
        if pdf_files:
            print(f"✓ Data folder found with {len(pdf_files)} PDF file(s)")
        else:
            print("⚠️  WARNING: No PDF files found in 'data' folder")
    
    print("\n" + "="*60)
    print("🌐 Server running at: http://localhost:8000")
    print("📡 API endpoints at: http://localhost:8000/api/")
    print("🎨 Frontend at: http://localhost:8000/")
    print("="*60 + "\n")
    
    app.run(host="0.0.0.0", port=8000, debug=True)
