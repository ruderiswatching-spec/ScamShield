const addFilesButton = document.querySelector(".add-files-button");
const fileInput = document.querySelector("#file-input");
const fileFeedback = document.querySelector("#file-feedback");
const selectedFilesList = document.querySelector("#selected-files");
const messageInput = document.querySelector("#message-input");
const checkSafetyButton = document.querySelector(".check-safety-button");
const rateLimitMessage = document.querySelector("#rate-limit-message");
const analysisLoading = document.querySelector("#analysis-loading");
const loadingMessage = document.querySelector("#loading-message");
const loadingStep = document.querySelector("#loading-step");
const analysisStatus = document.querySelector("#analysis-status");
const maxFileSize = 5 * 1024 * 1024;
const selectedFiles = [];
let requestInProgress = false;
let cooldownUntil = 0;
let cooldownInterval;
let cooldownType = "minute";

function renderSelectedFiles() {
    selectedFilesList.replaceChildren(
        ...selectedFiles.map((file, index) => {
            const item = document.createElement("li");
            item.className = "selected-file";

            const fileName = document.createElement("span");
            fileName.textContent = file.name;

            const removeButton = document.createElement("button");
            removeButton.className = "remove-file-button";
            removeButton.type = "button";
            removeButton.textContent = "\u00d7";
            removeButton.setAttribute("aria-label", `Remove ${file.name}`);
            removeButton.addEventListener("click", () => {
                selectedFiles.splice(index, 1);
                renderSelectedFiles();
                fileFeedback.textContent = `${file.name} removed.`;
            });

            item.append(fileName, removeButton);
            return item;
        })
    );
}

function updateCheckButtonState() {
    checkSafetyButton.disabled = requestInProgress || cooldownUntil > Date.now();
}

function startCooldown(seconds, limitType) {
    cooldownUntil = Date.now() + seconds * 1000;
    cooldownType = limitType;
    rateLimitMessage.hidden = false;

    const updateCountdown = () => {
        const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        if (remainingSeconds === 0) {
            clearInterval(cooldownInterval);
            cooldownUntil = 0;
            rateLimitMessage.hidden = true;
            rateLimitMessage.textContent = "";
            updateCheckButtonState();
            return;
        }

        if (cooldownType === "daily") {
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.ceil((remainingSeconds % 3600) / 60);
            rateLimitMessage.textContent =
                `You have used today’s checks. Please try again in ${hours} hours and ${minutes} minutes.`;
        } else {
            rateLimitMessage.textContent =
                `Please wait ${remainingSeconds} seconds before checking again.`;
        }
        updateCheckButtonState();
    };

    clearInterval(cooldownInterval);
    updateCountdown();
    cooldownInterval = setInterval(updateCountdown, 1000);
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result !== "string") {
                reject(new Error(`Could not read ${file.name}.`));
                return;
            }
            resolve(reader.result.slice(reader.result.indexOf(",") + 1));
        });
        reader.addEventListener("error", () => {
            reject(new Error(`Could not read ${file.name}.`));
        });
        reader.readAsDataURL(file);
    });
}

addFilesButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    const newFiles = Array.from(fileInput.files);
    if (newFiles.length === 0) {
        return;
    }

    // Calculate current total size of already selected files
    let currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    
    const acceptedFiles = [];
    const rejectedFiles = [];

    for (const file of newFiles) {
        // Check if individual file is under 5MB and adding it keeps total under 5MB
        if (file.size < maxFileSize && (currentTotalSize + file.size) <= maxFileSize) {
            acceptedFiles.push(file);
            currentTotalSize += file.size;
        } else {
            rejectedFiles.push(file);
        }
    }

    selectedFiles.push(...acceptedFiles);
    renderSelectedFiles();

    const feedback = [];
    if (acceptedFiles.length > 0) {
        feedback.push(`${acceptedFiles.length} file${acceptedFiles.length === 1 ? "" : "s"} added.`);
    }
    if (rejectedFiles.length > 0) {
        feedback.push(`Some files were skipped because they exceed the 5 MB total size limit.`);
    }
    fileFeedback.textContent = feedback.join(" ");
    fileInput.value = "";
});

checkSafetyButton.addEventListener("click", async () => {
    const text = messageInput.value.trim();
    if (text.length === 0 && selectedFiles.length === 0) {
        analysisStatus.textContent = "Paste a message or add a file first.";
        return;
    }

    requestInProgress = true;
    updateCheckButtonState();
    analysisStatus.textContent = "";
    analysisLoading.hidden = false;
    loadingMessage.textContent = "Checking your message now. Please wait.";
    loadingStep.textContent = "Step 1 of 3: Getting your message ready.";
    checkSafetyButton.textContent = "Checking now…";
    const progressTimer = setTimeout(() => {
        loadingMessage.textContent = "Still checking. Please keep this page open.";
    }, 12000);

    try {
        const files = await Promise.all(
            selectedFiles.map(async (file) => ({
                name: file.name,
                mimeType: file.type || "application/octet-stream",
                data: await readFileAsBase64(file)
            }))
        );
        loadingStep.textContent = "Step 2 of 3: Sending it for a safety check.";
        const request = fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, files })
        });
        loadingStep.textContent = "Step 3 of 3: The AI is checking for warning signs.";
        const response = await request;
        loadingStep.textContent = "Finishing: Getting your results ready.";
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(
                "The server returned an unreadable response. Start ScamShield with npm start and open http://127.0.0.1:3000."
            );
        }

        if (response.status === 429) {
            analysisStatus.textContent = "";
            startCooldown(result.retryAfterSeconds || 60, result.limitType || "minute");
            return;
        }
        if (!response.ok) {
            throw new Error(result.error || "The check could not be completed.");
        }

        sessionStorage.setItem("scamshield-analysis", JSON.stringify(result.analysis));
        window.location.assign("analysis.html");
    } catch (error) {
        analysisStatus.textContent = error.message || "The check could not be completed.";
    } finally {
        clearTimeout(progressTimer);
        analysisLoading.hidden = true;
        checkSafetyButton.textContent = "Check if this is safe";
        requestInProgress = false;
        updateCheckButtonState();
    }
});
