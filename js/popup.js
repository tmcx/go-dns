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


function activeActions() {
    $(".dns-group .name").click((e) => {
        const id = e.currentTarget.id;
        $(`.dns-group#${id}`).find(`.list, span.down, span.right`).toggle();
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
                        ${group.name}
                        <span class="down"></span>
                        <span class="right"></span>
                        <span class="delete-group" id="${alias}">X</span>
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
