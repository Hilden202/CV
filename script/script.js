fetch('txt/date.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('Kunde inte läsa datumfilen.');
        }
        return response.text();
    })
    .then(date => {
        document.getElementById("date").innerHTML = date;
    })
    .catch(error => {
        console.error('Fel vid inläsning av datum:', error);
    });