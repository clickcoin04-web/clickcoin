new Chart(document.getElementById("chart"), {
  type: "line",
  data: {
    labels: ["1","2","3","4","5","6"],
    datasets: [{
      label: "ClickCoin Market",
      data: [100,200,150,300,250,400]
    }]
  }
});

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>