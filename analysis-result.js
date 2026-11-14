const riskLevels = new Set(["Low", "Medium", "High"]);

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

export function parseAnalysisResult(responseText) {
    let result;
    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error("The analysis response was not valid JSON.");
    }

    if (!result || !riskLevels.has(result.riskLevel) ||
        !isNonEmptyString(result.summary) ||
        !isNonEmptyString(result.riskReason) ||
        !Array.isArray(result.signals) ||
        !result.signals.every((signal) =>
            signal &&
            isNonEmptyString(signal.evidence) &&
            isNonEmptyString(signal.explanation)
        ) ||
        !Array.isArray(result.nextSteps) ||
        result.nextSteps.length === 0 ||
        !result.nextSteps.every(isNonEmptyString) ||
        (result.riskLevel !== "Low" && result.signals.length === 0)) {
        throw new Error("The analysis response is missing required information.");
    }

    return {
        riskLevel: result.riskLevel,
        summary: result.summary.trim(),
        riskReason: result.riskReason.trim(),
        signals: result.signals.map((signal) => ({
            evidence: signal.evidence.trim(),
            explanation: signal.explanation.trim()
        })),
        nextSteps: result.nextSteps.map((step) => step.trim())
    };
}
