// Gọi API từ backend
fetch("/api/hello")
  .then(res => res.json())
  .then(data => {
    document.getElementById("msg").textContent = data.message;
  });
