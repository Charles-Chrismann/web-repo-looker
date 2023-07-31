'use strict';

const form = document.querySelector('form');

console.log(form);

form.addEventListener('submit', (e) => {
    console.log(form.elements.url.value);
    e.preventDefault();
    fetch(`/api/file/clone`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url: form.elements.url.value,
        }),
    }).then((response) => {
        return response.json();
    }).then((data) => {
        document.querySelector('#result').textContent = data.url;
        console.log(data);
    }).catch((err) => {
        console.log(err);
    })
})


