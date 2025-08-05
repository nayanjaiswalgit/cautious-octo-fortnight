"""
AI Service for handling OpenAI and Ollama integrations
Provides secure, credit-based AI functionality for finance tracking
"""

import json
import time
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
import openai
import ollama
from .models import UserAISettings, AIUsageLog, UserSubscription

User = get_user_model()


class AIService:
    """Centralized AI service for all AI-powered features"""
    
    def __init__(self):
        encryption_key = getattr(settings, 'AI_ENCRYPTION_KEY', None)
        if not encryption_key or encryption_key == 'your-encryption-key-here-change-in-production':
            # Generate a proper Fernet key
            encryption_key = Fernet.generate_key()
        elif isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()
        
        self.cipher_suite = Fernet(encryption_key)
        
        # Default system API key for free tier users
        self.system_openai_key = getattr(settings, 'OPENAI_API_KEY', '')
        self.system_ollama_endpoint = getattr(settings, 'OLLAMA_ENDPOINT', 'http://localhost:11434')
        
        # Credit costs for different operations
        self.credit_costs = {
            'categorization': 1,
            'invoice_generation': 5,
            'data_analysis': 3,
            'suggestions': 2,
            'bill_parsing': 4,
        }
    
    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt user's API key for secure storage"""
        if not api_key:
            return ''
        return self.cipher_suite.encrypt(api_key.encode()).decode()
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt user's API key"""
        if not encrypted_key:
            return ''
        try:
            return self.cipher_suite.decrypt(encrypted_key.encode()).decode()
        except Exception:
            return ''
    
    def check_user_credits(self, user: User, operation_type: str) -> Tuple[bool, str]:
        """Check if user has enough credits for the operation"""
        try:
            subscription = user.subscription
            credits_needed = self.credit_costs.get(operation_type, 1)
            
            if subscription.ai_credits_remaining < credits_needed:
                return False, f"Insufficient credits. Need {credits_needed}, have {subscription.ai_credits_remaining}"
            
            return True, "Credits available"
        except UserSubscription.DoesNotExist:
            return False, "No subscription found"
    
    def consume_credits(self, user: User, operation_type: str, credits_used: int = None) -> bool:
        """Consume user credits for AI operation"""
        if credits_used is None:
            credits_used = self.credit_costs.get(operation_type, 1)
        
        try:
            subscription = user.subscription
            if subscription.ai_credits_remaining >= credits_used:
                subscription.ai_credits_remaining -= credits_used
                subscription.ai_credits_used_this_month += credits_used
                subscription.save()
                return True
            return False
        except UserSubscription.DoesNotExist:
            return False
    
    def get_ai_client(self, user: User) -> Tuple[str, Any, str]:
        """Get the appropriate AI client for the user"""
        try:
            ai_settings = user.ai_settings
        except UserAISettings.DoesNotExist:
            # Create default settings
            ai_settings = UserAISettings.objects.create(user=user)
        
        provider = ai_settings.preferred_provider
        
        if provider == 'openai':
            api_key = self.decrypt_api_key(ai_settings.openai_api_key)
            if not api_key:
                api_key = self.system_openai_key
            
            if api_key:
                client = openai.OpenAI(api_key=api_key)
                return 'openai', client, ai_settings.openai_model
        
        elif provider == 'ollama':
            endpoint = ai_settings.ollama_endpoint or self.system_ollama_endpoint
            try:
                client = ollama.Client(host=endpoint)
                return 'ollama', client, ai_settings.ollama_model
            except Exception:
                pass
        
        # Fallback to system OpenAI
        if self.system_openai_key:
            client = openai.OpenAI(api_key=self.system_openai_key)
            return 'openai', client, 'gpt-3.5-turbo'
        
        return None, None, None
    
    def log_usage(self, user: User, usage_type: str, provider: str, model: str, 
                  credits_consumed: int, success: bool, input_data: str = '',
                  output_data: str = '', error_message: str = '', 
                  processing_time: float = 0.0, tokens_used: int = 0) -> AIUsageLog:
        """Log AI usage for analytics and billing"""
        return AIUsageLog.objects.create(
            user=user,
            usage_type=usage_type,
            provider=provider,
            model_used=model,
            credits_consumed=credits_consumed,
            tokens_used=tokens_used,
            input_data=input_data[:1000],  # Limit size
            output_data=output_data[:1000],  # Limit size
            success=success,
            error_message=error_message[:500],
            processing_time=processing_time
        )
    
    def categorize_transaction(self, user: User, description: str, amount: float, 
                             merchant: str = '') -> Dict[str, Any]:
        """Use AI to categorize a transaction"""
        operation_type = 'categorization'
        
        # Check credits
        has_credits, message = self.check_user_credits(user, operation_type)
        if not has_credits:
            return {'success': False, 'error': message}
        
        # Get AI client
        provider, client, model = self.get_ai_client(user)
        if not client:
            return {'success': False, 'error': 'No AI provider available'}
        
        start_time = time.time()
        input_data = f"Description: {description}, Amount: {amount}, Merchant: {merchant}"
        
        try:
            if provider == 'openai':
                result = self._categorize_with_openai(client, model, description, amount, merchant)
            else:
                result = self._categorize_with_ollama(client, model, description, amount, merchant)
            
            processing_time = time.time() - start_time
            
            if result['success']:
                self.consume_credits(user, operation_type)
                self.log_usage(
                    user, operation_type, provider, model,
                    self.credit_costs[operation_type], True,
                    input_data, str(result.get('category', '')),
                    processing_time=processing_time,
                    tokens_used=result.get('tokens_used', 0)
                )
            else:
                self.log_usage(
                    user, operation_type, provider, model, 0, False,
                    input_data, '', result.get('error', ''),
                    processing_time=processing_time
                )
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.log_usage(
                user, operation_type, provider, model, 0, False,
                input_data, '', str(e), processing_time=processing_time
            )
            return {'success': False, 'error': str(e)}
    
    def _categorize_with_openai(self, client, model: str, description: str, 
                               amount: float, merchant: str) -> Dict[str, Any]:
        """Categorize transaction using OpenAI"""
        prompt = f"""
        Categorize this financial transaction into one of these categories:
        - Food & Dining
        - Transportation
        - Shopping
        - Entertainment
        - Bills & Utilities
        - Healthcare
        - Education
        - Travel
        - Income
        - Transfer
        - Other
        
        Transaction details:
        Description: {description}
        Amount: ${amount}
        Merchant: {merchant}
        
        Respond with only the category name and a confidence score (0-100).
        Format: Category: [category], Confidence: [score]
        """
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0.1
        )
        
        content = response.choices[0].message.content.strip()
        tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else 0
        
        # Parse response
        try:
            parts = content.split(',')
            category = parts[0].replace('Category:', '').strip()
            confidence = int(parts[1].replace('Confidence:', '').strip())
            
            return {
                'success': True,
                'category': category,
                'confidence': confidence,
                'tokens_used': tokens_used
            }
        except Exception:
            return {
                'success': True,
                'category': 'Other',
                'confidence': 50,
                'tokens_used': tokens_used
            }
    
    def _categorize_with_ollama(self, client, model: str, description: str, 
                               amount: float, merchant: str) -> Dict[str, Any]:
        """Categorize transaction using Ollama"""
        prompt = f"""
        Categorize this transaction: {description} (${amount}) at {merchant}
        Categories: Food, Transport, Shopping, Entertainment, Bills, Healthcare, Education, Travel, Income, Transfer, Other
        Answer with just the category name.
        """
        
        response = client.generate(
            model=model,
            prompt=prompt,
            options={'temperature': 0.1, 'num_predict': 20}
        )
        
        category = response['response'].strip()
        
        return {
            'success': True,
            'category': category,
            'confidence': 80,  # Default confidence for Ollama
            'tokens_used': 0  # Ollama doesn't provide token count
        }
    
    def generate_invoice(self, user: User, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate invoice content using AI"""
        operation_type = 'invoice_generation'
        
        # Check credits
        has_credits, message = self.check_user_credits(user, operation_type)
        if not has_credits:
            return {'success': False, 'error': message}
        
        # Get AI client
        provider, client, model = self.get_ai_client(user)
        if not client:
            return {'success': False, 'error': 'No AI provider available'}
        
        start_time = time.time()
        input_data = json.dumps(invoice_data, default=str)
        
        try:
            if provider == 'openai':
                result = self._generate_invoice_with_openai(client, model, invoice_data)
            else:
                result = self._generate_invoice_with_ollama(client, model, invoice_data)
            
            processing_time = time.time() - start_time
            
            if result['success']:
                self.consume_credits(user, operation_type)
                self.log_usage(
                    user, operation_type, provider, model,
                    self.credit_costs[operation_type], True,
                    input_data, str(result.get('content', '')),
                    processing_time=processing_time,
                    tokens_used=result.get('tokens_used', 0)
                )
            else:
                self.log_usage(
                    user, operation_type, provider, model, 0, False,
                    input_data, '', result.get('error', ''),
                    processing_time=processing_time
                )
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.log_usage(
                user, operation_type, provider, model, 0, False,
                input_data, '', str(e), processing_time=processing_time
            )
            return {'success': False, 'error': str(e)}
    
    def _generate_invoice_with_openai(self, client, model: str, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate invoice content using OpenAI"""
        prompt = f"""
        Generate a professional invoice based on this data:
        {json.dumps(invoice_data, indent=2)}
        
        Include:
        - Professional header with invoice number
        - Detailed description of services/products
        - Clear payment terms
        - Total amount calculation
        - Professional footer
        
        Format as HTML that can be converted to PDF.
        """
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.3
        )
        
        content = response.choices[0].message.content.strip()
        tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else 0
        
        return {
            'success': True,
            'content': content,
            'tokens_used': tokens_used
        }
    
    def _generate_invoice_with_ollama(self, client, model: str, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate invoice content using Ollama"""
        prompt = f"""Generate a professional invoice HTML from this data: {json.dumps(invoice_data)}"""
        
        response = client.generate(
            model=model,
            prompt=prompt,
            options={'temperature': 0.3, 'num_predict': 500}
        )
        
        content = response['response'].strip()
        
        return {
            'success': True,
            'content': content,
            'tokens_used': 0
        }


# Global instance
ai_service = AIService()