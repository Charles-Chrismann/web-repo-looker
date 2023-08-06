'use strict';

function findInsertionIndex(sortedArray, targetString) {
    let left = 0;
    let right = sortedArray.length - 1;
  
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midValue = sortedArray[mid];
  
      if (midValue === targetString) {
        return mid;
      } else if (midValue < targetString) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return left;
}

const form = document.querySelector('form');
const result = document.querySelector('#result');
const userTemplate = document.querySelector('#user-template');
const repoTemplate = document.querySelector('#repo-template');
const statusEl = document.querySelector('#status');

document.querySelector('#result .fa-regular.fa-copy').addEventListener('click', (e) => {
    navigator.clipboard.writeText(location + result.querySelector('.result').textContent.substring(1)).then(
        () => {},
        (err) => {}
    );
});


form.addEventListener('submit', (e) => {
    e.preventDefault();
    result.classList.add('hidden');
    statusEl.classList.remove('hidden');
    fetch(`/api/file/clone`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url: form.elements.url.value,
            socketId: socketId,
        }),
    }).then((response) => response.json())
    .then((data) => {
        result.classList.remove('hidden', 'error', 'success');
        statusEl.classList.add('hidden');
        if (data.message) {
            result.classList.add('error');
            result.querySelector('.result').textContent = data.message;
        } else {
            result.classList.add('success');
            result.querySelector('.result').textContent = data.url;
            result.querySelector('.infos > a').attributes.href.value = data.url;

            let user = Array.from(document.querySelectorAll('#users > li'))
            .find((el) => el.querySelector('.user__infos > h4 > a').textContent === data.user);

            if (!user) {
                const userClone = userTemplate.content.cloneNode(true);
                console.log(userClone);
                userClone.querySelector('.user__infos > h4 > a').textContent = data.user;
                userClone.querySelector('.user__infos > h4 > a').attributes.href.value = 'https://github.com/' + data.user;
                userClone.querySelector('.user__infos > a').attributes.href.value = 'https://github.com/' + data.user;
                userClone.querySelector('.user__infos > a > img').src = `https://github.com/${data.user}.png?size=32`;
                userClone.querySelector('.user__infos > a > img').alt = data.user;
                const insertionIndex = findInsertionIndex(Array.from(document.querySelectorAll('#users > li')).map((el) => el.querySelector('.user__infos > h4 > a').textContent), data.user);

                if(insertionIndex === 0) document.querySelector('#users > li').before(userClone);
                else document.querySelectorAll('#users > li')[insertionIndex - 1].after(userClone);
            }
            user ??= Array.from(document.querySelectorAll('#users > li'))
            .find((el) => el.querySelector('.user__infos > h4 > a').textContent === data.user);

            const existringRepo = Array.from(user.querySelectorAll('.repos > li > a')).map((el) => el.attributes.href.value).includes(data.url);
            if(!existringRepo) {
                const repoClone = repoTemplate.content.cloneNode(true);
                repoClone.querySelector('li > a').textContent = data.url.split('/').at(3);
                repoClone.querySelector('li > a').attributes.href.value = data.url;
                user.querySelector('.repos').appendChild(repoClone);
            }
        }
    }).catch((err) => {
        console.log(err);
    })
})


