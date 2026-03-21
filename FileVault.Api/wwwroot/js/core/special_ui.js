export function showTerms() {
        const terms = `
    TERMS OF SERVICE (International Private Resource)

    1. GLOBAL SCOPE: This resource is a private educational project hosted globally. It does not fall under the jurisdiction of the Russian Federation.
    2. CONTENT POLICY: Users are strictly prohibited from uploading illegal content, malware, or any data that violates international copyright laws.
    3. NO WARRANTY: The service is provided "AS IS". The creator (artemkoncevoj4) is not responsible for any data loss or service interruptions.
    4. DATA PRIVACY: We do not collect personal identities. Your login is used only for access control.
    5. TERMINATION: The administrator reserves the right to terminate any account without prior notice for any reason.
        `;
        document.getElementById('legal-title').innerText = "Legal Information";
        document.getElementById('legal-content').innerText = terms;
        document.getElementById('legal-modal').classList.remove('hidden');
}

export function showPrivacy() {
        const privacyText = `
    PRIVACY POLICY

    1. DATA COLLECTION: We collect only the minimum data required for authentication: your username and a salted hash of your password.
    2. NO PERSONAL INFO: This service does not request, store, or process real names, emails, or phone numbers.
    3. COOKIES & SESSIONS: We use local storage and secure cookies only to keep you logged in. No tracking scripts are used.
    4. THIRD PARTIES: No data is ever shared with third-party advertisers or analytics companies.
    5. DATA LOCATION: Your encrypted data is stored on a private server managed by artemkoncevoj4.
        `;
        document.getElementById('legal-title').innerText = "Privacy Policy";
        document.getElementById('legal-content').innerText = privacyText;
        document.getElementById('legal-modal').classList.remove('hidden');
}