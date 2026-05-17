const dateStamp = document.getElementById("commitDateStamp");

window.cvReady = fetch("txt/date.txt")
    .then(response => response.text())
    .then(date => {
        if (dateStamp) {
            dateStamp.textContent = date.trim();
        }
    })
    .catch(() => {
        if (dateStamp) {
            dateStamp.textContent = "";
        }
    });

const cvFitBase = {
    bodyFontSize: 16,
    divMargin: 1,
    divPadding: 2,
    sectionPadding: 15,
    contactPadding: 15,
    rightH4PaddingTop: 8,
    rightH4PaddingBottom: 4,
    rightPPaddingTop: 4,
    rightPPaddingBottom: 8,
    rightPAfterH4PaddingTop: 2,
    lineHeight: 1.2,
    rightLineHeight: 1.45,
    listMarginBlock: 1,
    listPaddingLeft: 40
};

// Samma CSS-varden används av vanlig layout och PDF-fit, så spacing kan justeras utan separata print-hack.
function setCvFitVariables({ spacingScale = 1, fontScale = 1, lineScale = 1 } = {}) {
    const root = document.documentElement;
    const px = value => `${value.toFixed(3)}px`;
    const unit = value => value.toFixed(3);

    root.style.setProperty("--cv-body-font-size", px(cvFitBase.bodyFontSize * fontScale));
    root.style.setProperty("--cv-div-margin", px(cvFitBase.divMargin * spacingScale));
    root.style.setProperty("--cv-div-padding", px(cvFitBase.divPadding * spacingScale));
    root.style.setProperty("--cv-section-padding", px(cvFitBase.sectionPadding * spacingScale));
    root.style.setProperty("--cv-contact-padding", px(cvFitBase.contactPadding * spacingScale));
    root.style.setProperty("--cv-right-h4-padding-top", px(cvFitBase.rightH4PaddingTop * spacingScale));
    root.style.setProperty("--cv-right-h4-padding-bottom", px(cvFitBase.rightH4PaddingBottom * spacingScale));
    root.style.setProperty("--cv-right-p-padding-top", px(cvFitBase.rightPPaddingTop * spacingScale));
    root.style.setProperty("--cv-right-p-padding-bottom", px(cvFitBase.rightPPaddingBottom * spacingScale));
    root.style.setProperty("--cv-right-p-after-h4-padding-top", px(cvFitBase.rightPAfterH4PaddingTop * spacingScale));
    root.style.setProperty("--cv-line-height", unit(cvFitBase.lineHeight * lineScale));
    root.style.setProperty("--cv-right-line-height", unit(cvFitBase.rightLineHeight * lineScale));
    root.style.setProperty("--cv-list-margin-block", `${unit(cvFitBase.listMarginBlock * spacingScale)}em`);
    root.style.setProperty("--cv-list-padding-left", px(cvFitBase.listPaddingLeft * spacingScale));
}

function resetCvPdfFit() {
    setCvFitVariables();
}

function measureCvHeight() {
    const body = document.body;
    const bodyTop = body.getBoundingClientRect().top + window.scrollY;
    const childBottom = Array.from(body.children).reduce((bottom, child) => {
        const rect = child.getBoundingClientRect();
        return Math.max(bottom, rect.bottom + window.scrollY);
    }, 0);

    return Math.ceil(childBottom - bodyTop);
}

function fitCvToPdfPage(options = {}) {
    const config = {
        pageHeightMm: 470,
        scale: 0.83,
        safetyPx: 12,
        minSpacingScale: 0.82,
        minFontScale: 0.97,
        minLineScale: 0.94,
        ...options
    };

    const pxPerMm = 96 / 25.4;
    const availableHeight = (config.pageHeightMm * pxPerMm / config.scale) - config.safetyPx;
    const lineForSpacing = spacingScale => Math.max(
        config.minLineScale,
        1 - ((1 - spacingScale) * 0.45)
    );

    const apply = (spacingScale, fontScale = 1) => {
        setCvFitVariables({
            spacingScale,
            fontScale,
            lineScale: lineForSpacing(spacingScale)
        });
    };

    const fits = () => measureCvHeight() <= availableHeight;

    resetCvPdfFit();

    const initialHeight = measureCvHeight();
    if (initialHeight <= availableHeight) {
        return {
            fits: true,
            strategy: "none",
            height: initialHeight,
            availableHeight,
            spacingScale: 1,
            fontScale: 1
        };
    }

    // Steg 1: minska luft, padding och radavstånd innan textstorleken rörs.
    let low = config.minSpacingScale;
    let high = 1;
    let bestSpacing = config.minSpacingScale;

    for (let i = 0; i < 12; i += 1) {
        const mid = (low + high) / 2;
        apply(mid, 1);

        if (fits()) {
            bestSpacing = mid;
            low = mid;
        } else {
            high = mid;
        }
    }

    apply(bestSpacing, 1);
    if (fits()) {
        return {
            fits: true,
            strategy: "spacing",
            height: measureCvHeight(),
            availableHeight,
            spacingScale: bestSpacing,
            fontScale: 1
        };
    }

    // Steg 2: om spacing inte räcker, gör endast en försiktig fontminskning.
    low = config.minFontScale;
    high = 1;
    let bestFont = config.minFontScale;

    for (let i = 0; i < 12; i += 1) {
        const mid = (low + high) / 2;
        apply(config.minSpacingScale, mid);

        if (fits()) {
            bestFont = mid;
            low = mid;
        } else {
            high = mid;
        }
    }

    apply(config.minSpacingScale, bestFont);

    return {
        fits: fits(),
        strategy: "spacing-font",
        height: measureCvHeight(),
        availableHeight,
        spacingScale: config.minSpacingScale,
        fontScale: bestFont
    };
}

window.fitCvToPdfPage = fitCvToPdfPage;
window.resetCvPdfFit = resetCvPdfFit;

window.addEventListener("beforeprint", () => {
    fitCvToPdfPage();
});

window.addEventListener("afterprint", () => {
    resetCvPdfFit();
});
