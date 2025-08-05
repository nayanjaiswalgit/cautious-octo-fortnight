#!/usr/bin/env python
"""
Reset database script - removes all tables and creates fresh optimized schema
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'finance_tracker.settings')
django.setup()

from django.db import connection

def reset_database():
    """Reset the database by dropping all tables and recreating them"""
    print("Resetting database...")
    
    with connection.cursor() as cursor:
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        # Drop all tables except sqlite_sequence
        for table in tables:
            table_name = table[0]
            if table_name != 'sqlite_sequence':
                print(f"Dropping table: {table_name}")
                cursor.execute(f"DROP TABLE IF EXISTS {table_name};")
        
        # Drop sqlite_sequence to reset auto-increment counters
        cursor.execute("DROP TABLE IF EXISTS sqlite_sequence;")
        
        connection.commit()
    
    print("Database reset complete.")
    
    # Run migrations
    print("Running migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    print("Database setup complete!")

if __name__ == '__main__':
    reset_database()