from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework import serializers

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that accepts email instead of username
    """
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Change the username field to email
        if 'username' in self.fields:
            self.fields['email'] = self.fields.pop('username')
            self.fields['email'].help_text = 'Email address'
    
    def validate(self, attrs):
        # Use the username_field to get the correct field name
        authenticate_kwargs = {
            'username': attrs.get(self.username_field),
            'password': attrs.get('password'),
        }
        
        email = authenticate_kwargs['username']
        password = authenticate_kwargs['password']
        
        if email and password:
            # Try to authenticate with email
            user = authenticate(
                request=self.context.get('request'),
                **authenticate_kwargs
            )
            
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            # Set the user for token generation
            self.user = user
            
            # Generate tokens
            refresh = self.get_token(user)
            
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        else:
            raise serializers.ValidationError('Must include email and password.')
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims if needed
        token['email'] = user.email
        return token