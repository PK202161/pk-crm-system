document.getElementById('csvFile').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

// ...ย้ายฟังก์ชันทั้งหมดจาก <script> ใน index.html มาวางที่นี่...