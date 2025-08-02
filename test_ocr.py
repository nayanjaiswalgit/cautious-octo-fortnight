#!/usr/bin/env python3
"""
Simple test script to check OCR endpoint functionality
"""
import requests
import io
from PIL import Image
import os

# Create a simple test image
def create_test_image():
    # Create a simple white image with some text-like black rectangles
    img = Image.new('RGB', (400, 600), color='white')
    # We can't add actual text without additional libraries, but this simulates a receipt
    return img

def test_ocr_endpoint():
    url = 'http://localhost:8000/api/v1/transactions/process_receipt/'
    
    # Create test image
    test_img = create_test_image()
    img_buffer = io.BytesIO()
    test_img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    
    # Prepare the request
    files = {'invoice': ('test_receipt.jpg', img_buffer, 'image/jpeg')}
    headers = {
        'Authorization': 'Bearer YOUR_TOKEN_HERE',  # You'd need to replace this with actual token
    }
    
    try:
        # Test different HTTP methods to see what's allowed
        print("Testing OCR endpoint...")
        
        # First test OPTIONS to see allowed methods
        try:
            options_response = requests.options(url)
            print(f"OPTIONS response: {options_response.status_code}")
            print(f"Allowed methods: {options_response.headers.get('Allow', 'Not specified')}")
        except Exception as e:
            print(f"OPTIONS request failed: {e}")
        
        # Test POST request
        try:
            response = requests.post(url, files=files, headers=headers)
            print(f"POST response: {response.status_code}")
            if response.status_code == 405:
                print("405 Method Not Allowed - This confirms the issue")
                print(f"Response content: {response.text}")
            elif response.status_code == 401:
                print("401 Unauthorized - Expected without valid token")
            else:
                print(f"Unexpected response: {response.text}")
        except Exception as e:
            print(f"POST request failed: {e}")
            
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    print("Testing OCR endpoint for 405 Method Not Allowed issue...")
    print("Note: This test requires the Django server to be running on localhost:8000")
    test_ocr_endpoint()