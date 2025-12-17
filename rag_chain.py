import os
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFDirectoryLoader

def initialize_rag_chain():
    """
    Initialize the RAG chain with PDF documents from the data folder.
    Creates a FAISS vector store and retrieval chain for question answering.
    """
    try:
        # Load all PDF documents from the data folder
        print("Loading PDF documents from data/ folder...")
        loader = PyPDFDirectoryLoader("/Users/Navya Gupta/OneDrive/Desktop/ai-pet-chatbot/ai-pet-chatbot/backend/data")
        docs = loader.load()
        
        if not docs:
            raise ValueError("No PDF documents found in data/ folder")
        
        print(f"✓ Loaded {len(docs)} pages from PDF documents")
        
        # Split text into manageable chunks
        # RecursiveCharacterTextSplitter is better for PDFs
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        split_docs = text_splitter.split_documents(docs)
        
        print(f"✓ Split into {len(split_docs)} chunks")
        
        # Create embeddings and FAISS vector store
        print("Creating embeddings and FAISS vector store...")
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vectordb = FAISS.from_documents(split_docs, embeddings)
        
        # Create retriever with similarity search
        retriever = vectordb.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}  # Retrieve top 4 most relevant chunks
        )
        
        print("✓ Vector store created successfully")
        
        # Define LLM
        llm = ChatOpenAI(
            model='gpt-3.5-turbo',
            temperature=0.7
        )
        
        # Create system prompt for the chatbot
        system_prompt = (
            "You are PawCare AI, a helpful and friendly assistant for pet care. "
            "Use the following pieces of retrieved context from pet care documents to answer questions. "
            "The context may include information about pet nutrition, health, grooming, exercise, and general care. "
            "\n\n"
            "Guidelines:\n"
            "- Provide accurate, helpful, and actionable advice\n"
            "- If the answer is not in the context, politely say you don't have that information\n"
            "- Keep answers concise but comprehensive\n"
            "- Use a warm and encouraging tone\n"
            "- When relevant, mention specific pet types (dogs, cats, etc.)\n"
            "\n"
            "Context: {context}"
        )
        
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}")
        ])
        
        # Create the document chain
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        
        # Create the retrieval chain
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        print("✓ RAG chain initialized successfully\n")
        
        return rag_chain
        
    except Exception as e:
        print(f"Error initializing RAG chain: {e}")
        raise
