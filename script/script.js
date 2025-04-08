fetch('txt/date.txt')
    .then(response => response.text())
    .then(date => {
        document.getElementById("commitDateStamp").innerHTML = date;
    });
