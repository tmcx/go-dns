window.onload = async function () {
    try {
        var tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        let url = tabs[0].url;
        $(".add>input#current-url").val(url);
        $(".new>p#current-url").text($(".add>input#current-url").val());
        $(".add>input#current-url").keyup(() => {
            $(".new>p#current-url").text($(".add>input#current-url").val());
        });
    } catch (error) { }
    await loadGroups();
    $("#add-btn").click(() => $(`.add>.form`).toggle());
    $(".save-changes").click(async () => {
        await newAliasGroup();
        await pushAliasToExistingAliasGroup();
    });
    $(".cancel").click(() => closeForm());
}

let editing = false;

function activeActions() {
    $(".dns-group .name").click((e) => {
        if (!editing) {
            const id = e.currentTarget.id;
            $(`.dns-group#${id}`).find(`.list, span.down, span.right`).toggle();
        }
    });


    $(".delete-url").click(async (e) => {
        const url = e.currentTarget.dataset.url;
        const alias = e.currentTarget.id;
        await deleteUrlFromAliasesGroups(alias, url);
        await loadGroups();
    });

    $(".delete-group").click(async (e) => {
        const alias = e.currentTarget.id;
        await deleteAliasGroups(alias);
        await loadGroups();
    });

    $(".edit-alias").click(async (e) => {
        editing = true;
        e.stopPropagation();
        e.preventDefault();
        const alias = e.currentTarget.id;
        await editAlias(alias);
        await loadGroups();
        editing = false;
    });
}




async function loadGroups() {
    $(".dns-group").remove();
    $("#alias-selector").remove();
    groups = await getAliasesGroups();
    var htmlOptions = '';

    if (Object.values(groups).length > 0) {
        htmlOptions = '<option value="" selected></option>';
    }

    for (const alias in groups) {
        if (Object.hasOwnProperty.call(groups, alias)) {
            const group = groups[alias];
            var htmlUrls = "";

            for (const url of group.urls) {
                htmlUrls += `
                    <div class="url">
                        <a href="${url}" target="_blank" title="${url}">${url}</a>
                        <span class="delete-url" id="${alias}" data-url="${url}">X</span>
                    </div>
                `;
            }

            $(".dns-group-list").append(`
                <div class="dns-group" id="${alias}">
                    <div class="name" id="${alias}">
                        <span class="alias">[${alias}]</span>
                        <span class="group-name">${group.name}</span>
                        <span class="edition-menu" style="display:none">
                            Alias: 
                            <input type="text" value="${alias}" pattern="\S(.*\S)?" required placeholder="${alias}" title="This field is required">
                            Name: 
                            <input type="text" value="${group.name}" pattern="\\S(.*\\S)?" required placeholder="${group.name}" title="This field is required">
                            <span class="cancel-edition" title="Cancel" id="${alias}">X</span>
                            <span class="accept-edition" title="Accept" id="${alias}">✔</span>
                        </span>
                        <span class="down"></span>
                        <span class="right"></span>
                        <span class="delete-group" title="Delete group" id="${alias}">X</span>
                        <span class="edit-alias" title="Edit group" id="${alias}">✎</span>
                    </div>
                    <div class="list">${htmlUrls}</div>
                </div>
            `);

            htmlOptions += `<option value="${alias}">${group.name}</option>`;
        }
    }
    $(".form .existing").append(`<select id="alias-selector" ${(!htmlOptions.length) ? "disabled" : ""}>${htmlOptions}</select>`);

    activeActions();
}


function closeForm() {
    $(".new>input#name").val("");
    $(".new>input#alias").val("");
    $(`.add>.form`).toggle();
}


async function newAliasGroup() {
    group = {
        name: $(".new>input#name").val(),
        url: $(".add>input#current-url").val(),
        id: $(".new>input#alias").val(),
    };

    if (!!group.name && !!group.url && !!group.id) {

        groups = await getAliasesGroups();
        if (groups[group.id] && !groups[group.id].urls.includes(group.url)) {
            groups[group.id].urls.push(group.url);
        } else {
            groups[group.id] = {
                name: group.name,
                urls: [group.url]
            }
        }

        await setAliasesGroups(groups);
        await loadGroups();
        closeForm();
    }
}

async function pushAliasToExistingAliasGroup() {
    groups = await getAliasesGroups();

    const groupId = $("#alias-selector").val();
    if (!!groupId) {
        const groupUrl = $(".add>input#current-url").val();

        if (groups[groupId] && !groups[groupId].urls.includes(groupUrl)) {
            groups[groupId].urls.push(groupUrl);
        }

        await setAliasesGroups(groups);
        await loadGroups();
        closeForm();
    }
}


async function getAliasesGroups() {
    return (await chrome.storage.local.get(['aliases-groups']))['aliases-groups'] || {};
}

async function setAliasesGroups(groups) {
    await chrome.storage.local.set({ "aliases-groups": groups });
}

async function deleteUrlFromAliasesGroups(alias, url) {
    var groups = await getAliasesGroups();
    if (groups[alias]) {
        groups[alias].urls = groups[alias].urls.filter(e => e != url);
    }
    await setAliasesGroups(groups);
}

async function deleteAliasGroups(alias) {
    var groups = await getAliasesGroups();
    if (groups[alias]) {
        delete groups[alias];
    }
    await setAliasesGroups(groups);
}

async function editAlias(alias) {
    return new Promise((res) => {
        const baseLocation = `.dns-group#${alias} .name`;
        const baseElement = document.querySelector(baseLocation);

        baseElement.querySelectorAll('.alias,.group-name')
            .forEach((e) => e.textContent = '');

        baseElement.querySelectorAll('.edit-alias,.down,.right,.delete-group')
            .forEach((e) => e.style.display = 'none');

        baseElement.querySelector('.cancel-edition').addEventListener('click', res);

        baseElement.querySelector('.edition-menu').style.display = 'inline';
        const acceptElement = baseElement.querySelector('.accept-edition');

        const newAliasElement = baseElement.querySelector('input[type="text"][value]');
        const newNameElement = baseElement.querySelector('input[type="text"][value] + input[type="text"][value]');

        const disableButton = async () => {
            var groups = await getAliasesGroups();
            acceptElement.disabled = !newAliasElement.value || !newNameElement.value || groups[newAliasElement.value] && newAliasElement.value != alias;
            acceptElement.style.cursor = acceptElement.disabled ? 'not-allowed' : 'pointer';
            acceptElement.style.opacity = acceptElement.disabled ? '0.5' : '1';
            acceptElement.setAttribute('title', acceptElement.disabled ? 'Both fields are required' : 'Accept');
            if (groups[newAliasElement.value] && newAliasElement.value != alias) {
                acceptElement.setAttribute('title', acceptElement.disabled ? 'Alias already exists' : '');
            }
        }

        disableButton();
        [newAliasElement, newNameElement].forEach(e => e.addEventListener('keyup', disableButton));


        acceptElement.addEventListener('click', async (e) => {
            const newAlias = newAliasElement.value;
            const newName = newNameElement.value;

            var groups = await getAliasesGroups();

            if (groups[newAlias] && newAlias != alias) {
                return;
            }
            if (!!newAlias && !!newName) {
                groups[newAlias] = {
                    name: newName,
                    urls: JSON.parse(JSON.stringify(groups[alias].urls))
                };
                delete groups[alias];
                await setAliasesGroups(groups);
                console.log(groups);
                res();
            }
        })
    });
}
