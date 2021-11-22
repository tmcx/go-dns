chrome.omnibox.onInputEntered.addListener(async (aliasBar) => {
    const aliasesGroups = await getAliasesGroups();
    const aliases = Object.keys(aliasesGroups);

    for (const alias of aliases) {
        if (alias.startsWith(aliasBar)) {
            for (const url of aliasesGroups[alias].urls) {
                chrome.tabs.create({ url });
            }
            break;
        }
    }
});

async function getAliasesGroups() {
    return (await chrome.storage.local.get(['aliases-groups']))['aliases-groups'] || {};
}

function setAliasesGroups(value) {
    chrome.storage.local.set({ "aliases-groups": value });
}
