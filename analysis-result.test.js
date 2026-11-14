import assert from "node:assert/strict";
import test from "node:test";
import { parseAnalysisResult } from "./analysis-result.js";

test("parses a structured risk assessment with evidence and next steps", () => {
    const result = parseAnalysisResult(JSON.stringify({
        riskLevel: "High",
        summary: "This message has strong signs of a scam.",
        riskReason: "It uses a short deadline to pressure you to pay before verifying the sender.",
        signals: [{
            evidence: "Pay within 10 minutes",
            explanation: "The short deadline pressures you to act before checking."
        }],
        nextSteps: ["Do not pay.", "Contact the organization using its official number."]
    }));

    assert.equal(result.riskLevel, "High");
    assert.match(result.riskReason, /deadline/);
    assert.equal(result.signals[0].evidence, "Pay within 10 minutes");
    assert.equal(result.nextSteps.length, 2);
});

test("accepts an assessment with no identified warning signs", () => {
    const result = parseAnalysisResult(JSON.stringify({
        riskLevel: "Low",
        summary: "No clear warning signs were found.",
        riskReason: "The provided material does not show clear pressure or requests for sensitive information.",
        signals: [],
        nextSteps: ["Check with the sender through a contact method you already trust."]
    }));

    assert.deepEqual(result.signals, []);
});

test("rejects malformed or incomplete risk assessments", () => {
    assert.throws(() => parseAnalysisResult("not json"), /not valid JSON/);
    assert.throws(() => parseAnalysisResult(JSON.stringify({
        riskLevel: "Certain",
        summary: "It is safe.",
        riskReason: "It seems normal.",
        signals: [],
        nextSteps: ["Open the link."]
    })), /missing required information/);
    assert.throws(() => parseAnalysisResult(JSON.stringify({
        riskLevel: "High",
        summary: "This looks risky.",
        riskReason: "The sender cannot be verified.",
        signals: [],
        nextSteps: ["Check with the organization."]
    })), /missing required information/);
});
