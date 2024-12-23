document.addEventListener('DOMContentLoaded', () => {
    const videoUpload = document.getElementById('videoUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const durationRange = document.getElementById('durationRange');
    const durationValue = document.getElementById('durationValue');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const videoContainer = document.getElementById('videoContainer');
    const originalVideo = document.getElementById('originalVideo');
    const timelapseVideo = document.getElementById('timelapsevideo');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let uploadedVideo = null;
    let timelapseBlob = null;
    let isGenerating = false;

    downloadBtn.disabled = true;

    function showModal(title, content, showProgress = false, autoClose = true) {
        modalTitle.textContent = title;
        modalContent.textContent = content;
        progressContainer.classList.toggle('hidden', !showProgress);
        if (showProgress) {
            progressBar.value = 0;
            progressText.textContent = '0%';
        }
        modal.classList.remove('hidden');
        
        if (autoClose) {
            setTimeout(() => {
                hideModal();
            }, 600);
        }

        if (isGenerating) {
            modalCloseBtn.textContent = 'Cancel';
            modalCloseBtn.classList.remove('hidden');
        } else {
            modalCloseBtn.classList.add('hidden');
        }
    }

    function hideModal() {
        modal.classList.add('hidden');
    }

    function updateProgress(value) {
        progressBar.value = value;
        progressText.textContent = `${Math.round(value)}%`;
    }

    modalCloseBtn.addEventListener('click', () => {
        if (isGenerating) {
            // TODO: Implement cancel logic for generation process
            isGenerating = false;
        }
        hideModal();
    });

    videoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadedVideo = file;
            fileNameDisplay.textContent = file.name;
            originalVideo.src = URL.createObjectURL(file);
            originalVideo.onloadedmetadata = () => {
                durationRange.max = Math.floor(originalVideo.duration);
                durationRange.value = Math.min(10, Math.floor(originalVideo.duration));
                updateDurationValue();
                showModal('Video Uploaded', 'Your video has been successfully uploaded. You can now adjust the time-lapse duration and generate the time-lapse.');
            };
        }
    });

    durationRange.addEventListener('input', updateDurationValue);

    function updateDurationValue() {
        durationValue.textContent = `${parseFloat(durationRange.value).toFixed(1)} seconds`;
    }

    function calculateTimeLapseFrames(originalDuration, timeLapseDuration) {
        const totalOriginalFrames = Math.floor(originalDuration * 30); // Assume 30 FPS
        const totalTimeLapseFrames = Math.floor(timeLapseDuration * 30);
        const step = totalOriginalFrames / totalTimeLapseFrames;
        
        const frameIndices = [];
        
        for (let i = 0; i < totalTimeLapseFrames; i++) {
            frameIndices.push(Math.min(Math.floor(i * step), totalOriginalFrames - 1));
        }
        
        return frameIndices;
    }

    generateBtn.addEventListener('click', generateTimelapse);

    async function generateTimelapse() {
        if (!uploadedVideo) {
            showModal('Error', 'Please upload a video first.');
            return;
        }

        // Clear previous time-lapse video
        timelapseVideo.src = '';
        timelapseBlob = null;
        downloadBtn.disabled = true;

        isGenerating = true;
        showModal('Generating Time-lapse', 'Please wait while we generate your time-lapse video. This may take a few moments.', true, false);

        const desiredDuration = parseFloat(durationRange.value);
        const originalDuration = originalVideo.duration;

        const frameIndices = calculateTimeLapseFrames(originalDuration, desiredDuration);

        const canvas = document.createElement('canvas');
        canvas.width = originalVideo.videoWidth;
        canvas.height = originalVideo.videoHeight;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30); // Assume 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            timelapseBlob = new Blob(chunks, { type: 'video/webm' });
            timelapseVideo.src = URL.createObjectURL(timelapseBlob);
            downloadBtn.disabled = false;
            hideModal();
            isGenerating = false;
            showModal('Time-lapse Generated', `Your time-lapse video has been successfully generated with a duration of ${desiredDuration.toFixed(2)} seconds. You can now preview and download it.`);
        };

        recorder.start();

        for (let i = 0; i < frameIndices.length; i++) {
            const frameIndex = frameIndices[i];
            originalVideo.currentTime = frameIndex / 30; // Assume 30 FPS
            await new Promise(resolve => {
                originalVideo.onseeked = () => {
                    ctx.drawImage(originalVideo, 0, 0, canvas.width, canvas.height);
                    updateProgress((i + 1) / frameIndices.length * 100);
                    resolve();
                };
            });
        }

        recorder.stop();
    }

    downloadBtn.addEventListener('click', () => {
        if (timelapseBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(timelapseBlob);
            a.download = 'timelapse.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showModal('Download Started', 'Your time-lapse video download has started. Check your downloads folder.');
        }
    });
});