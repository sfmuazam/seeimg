const video = document.getElementById('camera');
const captureButton = document.getElementById('capture-button');
const switchCameraButton = document.getElementById('switch-camera');
const resultContainer = document.getElementById('result-container');
const cameraContainer = document.getElementById('camera-container');
const uploadContainer = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const capturedImage = document.getElementById('captured-image');
const caption = document.getElementById('caption');
const retakeButton = document.getElementById('retake-button');
const replayCaptionButton = document.getElementById('replay-caption-button');
const stopCaptionButton = document.getElementById('stop-caption-button');
const closeButton = document.getElementById('close-button');
const reuploadButton = document.getElementById('reupload-button');
const replayUploadCaptionButton = document.getElementById('replay-upload-caption-button');
const stopUploadCaptionButton = document.getElementById('stop-upload-caption-button');
const closeUploadButton = document.getElementById('close-upload-button');
const cameraTab = document.getElementById('camera-tab');
const uploadTab = document.getElementById('upload-tab');
const cameraResultButtons = document.getElementById('camera-result-buttons');
const uploadResultButtons = document.getElementById('upload-result-buttons');

let currentStream;
let useFrontCamera = true;
let speechSynthesisUtterance;
let recognition;

// Detect if the device is Android
const isAndroid = /android/i.test(navigator.userAgent);

// Set initial camera facing mode based on device type
const initialFacingMode = isAndroid ? 'environment' : 'user';

const constraints = {
    video: {
        facingMode: initialFacingMode
    }
};

cameraTab.addEventListener('click', () => {
    cameraContainer.classList.remove('hidden');
    uploadContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    cameraTab.classList.add('bg-blue-500', 'text-white');
    cameraTab.classList.remove('bg-gray-300');
    uploadTab.classList.add('bg-gray-300');
    uploadTab.classList.remove('bg-blue-500', 'text-white');
    stopSpeaking();
    stopCamera();
    initCamera();
    startSpeechRecognition();
});

uploadTab.addEventListener('click', () => {
    cameraContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    uploadTab.classList.add('bg-blue-500', 'text-white');
    uploadTab.classList.remove('bg-gray-300');
    cameraTab.classList.add('bg-gray-300');
    cameraTab.classList.remove('bg-blue-500', 'text-white');
    stopSpeaking();
    stopCamera();
    stopSpeechRecognition();
    fileInput.value = '';  // Reset the file input
});

async function initCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
    } catch (error) {
        console.error('Error accessing the camera: ', error);
        alert('Could not access the camera. Please check your browser settings.');
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

captureButton.addEventListener('click', async () => {
    disableButtons(true);
    captureButton.textContent = 'Processing...';

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');
    capturedImage.src = imageData;

    // Stop the camera feed and freeze the captured image
    stopCamera();
    video.srcObject = null;
    video.poster = imageData;

    const compressedImage = await compressImage(imageData);

    await uploadImageAndGetCaption(compressedImage, 'camera');

    disableButtons(false);
    captureButton.textContent = 'Capture';
});

switchCameraButton.addEventListener('click', () => {
    useFrontCamera = !useFrontCamera;
    constraints.video.facingMode = useFrontCamera ? 'user' : 'environment';
    stopCamera();
    initCamera();
});

uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;

    disableButtons(true);
    uploadButton.textContent = 'Processing...';

    const reader = new FileReader();
    reader.onloadend = async () => {
        const imageData = reader.result;
        capturedImage.src = imageData;

        const compressedImage = await compressImage(imageData);
        await uploadImageAndGetCaption(compressedImage, 'upload');
    };
    reader.readAsDataURL(file);
});

retakeButton.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
    cameraContainer.classList.remove('hidden');
    stopSpeaking();
    initCamera();
    startSpeechRecognition();
});

reuploadButton.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
    disableButtons(false);
    stopSpeaking();
});

replayCaptionButton.addEventListener('click', () => {
    speakCaption(caption.textContent);
});

replayUploadCaptionButton.addEventListener('click', () => {
    speakCaption(caption.textContent);
});

stopCaptionButton.addEventListener('click', () => {
    stopSpeaking();
});

stopUploadCaptionButton.addEventListener('click', () => {
    stopSpeaking();
});

closeButton.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
    cameraContainer.classList.remove('hidden');
    stopSpeaking();
    initCamera();
    startSpeechRecognition();
});

closeUploadButton.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
    disableButtons(false);
    stopSpeaking();
});

async function compressImage(imageData) {
    const canvas = document.createElement('canvas');
    const img = new Image();
    return new Promise((resolve) => {
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));  // Compress image to 70% quality
        };
        img.src = imageData;
    });
}

async function uploadImageAndGetCaption(imageData, source) {
    try {
        const uploadResponse = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID 0a03b1d86705961',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData.split(',')[1], type: 'base64' })
        });

        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.data.link;

        const apiResponse = await fetch(`https://api.nyx.my.id/ai/bardimg?text=deskripsikan%20gambar%20ini&url=${encodeURIComponent(imageUrl)}`);
        const apiData = await apiResponse.json();
        
        const captionText = apiData.result;
        caption.textContent = captionText;
        speakCaption(captionText);
        
        cameraContainer.classList.add('hidden');
        uploadContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        if (source === 'camera') {
            cameraResultButtons.classList.remove('hidden');
            uploadResultButtons.classList.add('hidden');
        } else if (source === 'upload') {
            uploadResultButtons.classList.remove('hidden');
            cameraResultButtons.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        disableButtons(false);
        captureButton.textContent = 'Capture';
        uploadButton.textContent = 'Upload';
    }
}

function speakCaption(text) {
    if ('speechSynthesis' in window) {
        speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
        speechSynthesisUtterance.lang = 'id-ID';
        window.speechSynthesis.speak(speechSynthesisUtterance);
    } else {
        showToastError('Speech synthesis is not supported in this browser.');
    }
}

function stopSpeaking() {
    if (speechSynthesisUtterance) {
        window.speechSynthesis.cancel();
    }
}

function showToastError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function disableButtons(disable) {
    captureButton.disabled = disable;
    switchCameraButton.disabled = disable;
    uploadButton.disabled = disable;
    retakeButton.disabled = disable;
    reuploadButton.disabled = disable;
    replayCaptionButton.disabled = disable;
    replayUploadCaptionButton.disabled = disable;
    stopCaptionButton.disabled = disable;
    stopUploadCaptionButton.disabled = disable;
    closeButton.disabled = disable;
    closeUploadButton.disabled = disable;
}

function startSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            if (['foto', 'potret', 'tangkap', 'capture'].includes(transcript)) {
                captureButton.click();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.start();
    } else {
        showToastError('Speech recognition is not supported in this browser.');
    }
}

function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

window.addEventListener('beforeunload', () => {
    stopSpeaking();
    stopSpeechRecognition();
    stopCamera();
});

initCamera();
startSpeechRecognition();