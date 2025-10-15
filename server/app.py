from flask import Flask, request, jsonify, send_from_directory, session
import os
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import random

try:
    from ultralytics import YOLO
    yolo_available = True
except ImportError:
    yolo_available = False
    import easyocr
    import torchvision.transforms as transforms
    import torch

app = Flask(__name__, static_folder='../site')
app.secret_key = 'supersecretkey'

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('../site/images', filename)

@app.route('/captcha', methods=['GET'])
def get_captcha():
    image_files = [f for f in os.listdir('../site/images') if f.endswith('.jpg')]
    
    # For simplicity, we'll hardcode the targets and their images.
    # In a real application, this could be more dynamic.
    targets = {
        'bus': ['1.jpg', '2.jpg', '3.jpg'],
        'car': ['4.jpg', '5.jpg', '6.jpg'],
        'motorcycle': ['7.jpg', '8.jpg', '9.jpg']
    }
    
    target_name = random.choice(list(targets.keys()))
    correct_images = targets[target_name]
    
    # Select some correct images and some incorrect ones.
    num_correct = random.randint(2, 4)
    num_incorrect = 9 - num_correct
    
    selected_correct = random.sample(correct_images, min(num_correct, len(correct_images)))
    
    incorrect_pool = [img for t, imgs in targets.items() if t != target_name for img in imgs]
    selected_incorrect = random.sample(incorrect_pool, min(num_incorrect, len(incorrect_pool)))
    
    captcha_images = selected_correct + selected_incorrect
    random.shuffle(captcha_images)
    
    session['solution'] = selected_correct
    
    return jsonify({
        'target': target_name,
        'images': captcha_images
    })

@app.route('/solution', methods=['GET'])
def get_solution():
    return jsonify({'solution': session.get('solution', [])})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    image_data = data["image"]
    mode = data["mode"]

    # Decode base64 image data to PIL image
    image = decode_base64_to_image(image_data)

    if mode == "grid":
        if yolo_available:
            results = run_yolo_detection(image)
            suggestions = map_yolo_detections_to_grid(image, results)
        else:
            suggestions = run_easyocr_grid(image, target_keyword="bus") # example target keyword
    else:
        return jsonify({"error": "Invalid mode"}), 400

    return jsonify({"suggestions": suggestions})

def decode_base64_to_image(image_data):
    """Decodes base64 image data URL to PIL Image."""
    prefix, base64_data = image_data.split(';base64,')
    image = Image.open(BytesIO(base64.b64decode(base64_data)))
    return image

def run_yolo_detection(image):
    """Runs YOLO detection model on the image."""
    model = YOLO('yolov8n.pt')  # load a pretrained model
    results = model(image)  # predict on an image
    return results

def map_yolo_detections_to_grid(image, results):
    """Maps YOLO detections to suggestion boxes (x1, y1, x2, y2) relative to the cropped image."""
    suggestions = []
    for *xyxy, conf, cls in results.xyxy[0]:
        x1, y1, x2, y2 = map(int, xyxy)
        label = results.names[int(cls)]
        suggestions.append({
            "x1": x1 / image.width,
            "y1": y1 / image.height,
            "x2": x2 / image.width,
            "y2": y2 / image.height,
            "label": label,
            "conf": float(conf)
        })
    return suggestions

def run_easyocr_grid(image, target_keyword):
    """Splits the input image into a 3x3 grid, runs EasyOCR on each cell, and marks cells whose predicted label contains the target keyword."""
    reader = easyocr.Reader(['en'])
    width, height = image.size
    cell_width = width / 3
    cell_height = height / 3
    suggestions = []

    for i in range(3):
        for j in range(3):
            left = j * cell_width
            top = i * cell_height
            right = (j + 1) * cell_width
            bottom = (i + 1) * cell_height
            cropped_image = image.crop((left, top, right, bottom))
            results = reader.readtext(np.array(cropped_image))
            for (bbox, text, prob) in results:
                if target_keyword.lower() in text.lower():
                    suggestions.append({
                        "cell": i * 3 + j,
                        "conf": prob,
                        "label": text
                    })
    return suggestions

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)