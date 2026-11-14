import { parseAnalysisResult } from "./analysis-result.js";

const resultCard = document.querySelector("#result-card");
const pageStatus = document.querySelector("#page-status");
const riskBadge = document.querySelector("#risk-badge");
const riskLevel = document.querySelector("#risk-level");
const riskDescription = document.querySelector("#risk-description");
const resultSummary = document.querySelector("#result-summary");
const riskReason = document.querySelector("#risk-reason");
const suspiciousSignals = document.querySelector("#suspicious-signals");
const nextSteps = document.querySelector("#next-steps");
const backButton = document.querySelector("#back-button");

const riskDescriptions = {
    Low: "No clear warning signs were found. This does not prove it is safe.",
    Medium: "Some warning signs were found. Pause and check before acting.",
    High: "Strong warning signs were found. Do not reply, click, or pay until you check."
};

function showLoadError(message, error) {
    console.error("Could not load the safety check:", error);
    pageStatus.textContent = message;
}

function makeSignalItem(signal) {
    const item = document.createElement("li");
    const evidence = document.createElement("strong");
    evidence.className = "signal-evidence";
    evidence.textContent = signal.evidence;

    const explanation = document.createElement("p");
    explanation.textContent = signal.explanation;

    item.append(evidence, explanation);
    return item;
}

backButton.addEventListener("click", () => {
    window.location.assign("index.html");
});

try {
    const savedResult = sessionStorage.getItem("scamshield-analysis");
    if (savedResult === null) {
        pageStatus.textContent = "There is no saved check yet. Go back and check a message or file first.";
    } else {
        const analysis = parseAnalysisResult(savedResult);
        riskLevel.textContent = analysis.riskLevel;
        riskBadge.className = `risk-badge risk-${analysis.riskLevel.toLowerCase()}`;
        riskDescription.textContent = riskDescriptions[analysis.riskLevel];
        resultSummary.textContent = analysis.summary;
        riskReason.textContent = analysis.riskReason;

        if (analysis.signals.length === 0) {
            const item = document.createElement("li");
            item.className = "no-signals";
            item.textContent = "No clear warning signs were found in the message or file.";
            suspiciousSignals.replaceChildren(item);
        } else {
            suspiciousSignals.replaceChildren(...analysis.signals.map(makeSignalItem));
        }

        nextSteps.replaceChildren(
            ...analysis.nextSteps.map((step) => {
                const item = document.createElement("li");
                item.textContent = step;
                return item;
            })
        );

        pageStatus.hidden = true;
        resultCard.hidden = false;
    }
} catch (error) {
    showLoadError("We couldn’t show this result. Go back and run the check again.", error);
}
