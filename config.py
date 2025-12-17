import os

class Config:
    #ENTER YOUR OPENAI KEY
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'OPENAI KEY'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///pawcare.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

        # Session configuration
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'  # 'Lax' for same-origin, 'None' for cross-origin

