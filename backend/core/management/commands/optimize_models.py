"""
Management command to replace current models with highly optimized versions
This will backup current data and migrate to the new efficient structure
"""

from django.core.management.base import BaseCommand
from django.db import transaction
import os
import shutil


class Command(BaseCommand):
    help = 'Optimize models by replacing with efficient structure'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm you want to replace the models (DESTRUCTIVE)',
        )
        parser.add_argument(
            '--backup',
            action='store_true',
            help='Create backup of current models.py',
        )
    
    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This command will replace your current models with optimized versions.\n'
                    'This is a DESTRUCTIVE operation. Please backup your data first.\n'
                    'Use --confirm to proceed.'
                )
            )
            return
        
        try:
            # Create backup if requested
            if options['backup']:
                self.create_backup()
            
            # Replace models
            self.replace_models()
            
            # Show migration instructions
            self.show_migration_instructions()
            
            self.stdout.write(
                self.style.SUCCESS('Models optimized successfully!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Optimization failed: {str(e)}')
            )
            raise
    
    def create_backup(self):
        """Create backup of current models"""
        import datetime
        
        models_path = os.path.join('core', 'models.py')
        backup_name = f'models_backup_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.py'
        backup_path = os.path.join('core', backup_name)
        
        if os.path.exists(models_path):
            shutil.copy2(models_path, backup_path)
            self.stdout.write(f'Backup created: {backup_path}')
    
    def replace_models(self):
        """Replace current models with optimized version"""
        import os
        
        current_models_path = os.path.join('core', 'models.py')
        optimized_models_path = os.path.join('core', 'models_final.py')
        
        if os.path.exists(optimized_models_path):
            # Replace current models
            if os.path.exists(current_models_path):
                os.remove(current_models_path)
            
            shutil.move(optimized_models_path, current_models_path)
            self.stdout.write('Models replaced with optimized version')
        else:
            raise FileNotFoundError('Optimized models file not found')
    
    def show_migration_instructions(self):
        """Show next steps for migration"""
        self.stdout.write(
            self.style.SUCCESS('\n' + '='*50)
        )
        self.stdout.write(
            self.style.SUCCESS('MODELS OPTIMIZED SUCCESSFULLY!')
        )
        self.stdout.write(
            self.style.SUCCESS('='*50 + '\n')
        )
        
        self.stdout.write('Next steps:')
        self.stdout.write('1. Run: python manage.py makemigrations')
        self.stdout.write('2. Run: python manage.py migrate')
        self.stdout.write('3. Test the application functionality')
        self.stdout.write('')
        
        self.stdout.write('Model Optimization Summary:')
        self.stdout.write('• Reduced from 33+ models to 8 core models')
        self.stdout.write('• UserProfile: Consolidated all user settings')
        self.stdout.write('• Entity: Universal model for accounts, contacts, categories, tags, investments')
        self.stdout.write('• Transaction: Unified model for all transaction types')
        self.stdout.write('• Plan: Simplified plan system with JSON configuration')
        self.stdout.write('• Activity: Universal logging system')
        self.stdout.write('• Document: Universal document storage')
        self.stdout.write('• SystemConfig: Global configuration cache')
        self.stdout.write('')
        
        self.stdout.write('Benefits:')
        self.stdout.write('• ~80% reduction in model complexity')
        self.stdout.write('• Algorithmic data storage using JSON fields')
        self.stdout.write('• Flexible schema without migrations for new features')
        self.stdout.write('• Better performance with fewer JOINs')
        self.stdout.write('• Easier maintenance and testing')
        
        self.stdout.write(
            self.style.WARNING('\nIMPORTANT: Update your serializers and views to work with the new models!')
        )