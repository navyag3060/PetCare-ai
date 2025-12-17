import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or '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'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///pawcare.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

        # Session configuration
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'  # 'Lax' for same-origin, 'None' for cross-origin

