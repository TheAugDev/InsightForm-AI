// script.js - InsightForm AI

document.addEventListener('DOMContentLoaded', function () {
    console.log("InsightForm AI Script Initializing..."); // Keep one initial log

    // --- Configuration ---
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwB3mS-AoevSVhbpL6cKZcG1FV1JLv9goybZeC_FeFISZM1HU7_YtVxpJTmT2VjL3Dx/exec'; // << YOUR WEB APP URL HERE
    const introDuration = 2500; // Duration of intro screen in milliseconds

    // --- Element Selections ---
    const introScreen = document.getElementById('introScreen');
    const mainFormContainer = document.getElementById('mainFormContainer');
    
    const formPages = document.querySelectorAll('fieldset[id^="page"]');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const progressBarActual = document.getElementById('progressBarActual');

    // E-commerce conditional display elements
    const ecommerceSelect = document.getElementById('ecommerce');
    const ecommerceDetailsGroup = document.getElementById('ecommerceDetailsGroup');
    const ecommerceDetailsText = document.getElementById('ecommerceDetails'); // For clearing/making required if needed

    // "Main Goals - Other" conditional display elements
    const goalOtherToggle = document.getElementById('goal_other_toggle');
    const mainGoalsOtherContainer = document.getElementById('mainGoals_other_container');
    const mainGoalsOtherText = document.getElementById('mainGoals_other_text');

    // --- State Management ---
    let currentPage = 1;
    const totalPages = formPages.length;

    // --- Intro Screen Logic ---
    if (introScreen && mainFormContainer) {
        setTimeout(() => {
            introScreen.classList.add('hidden');
            setTimeout(() => {
                 mainFormContainer.classList.add('visible');
            }, 300); 
        }, introDuration);
    } else {
        console.warn("Intro screen or main form container not found. Skipping intro logic.");
        if(mainFormContainer) mainFormContainer.classList.add('visible');
    }

    // --- Initial Setup for Progress Bar ---
    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    }

    // --- Helper Functions ---
    function getLegendText(pageNumber) {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            const pageFieldset = document.getElementById(`page${pageNumber}`);
            if (pageFieldset) {
                const legend = pageFieldset.querySelector('legend');
                if (legend && legend.textContent) {
                    const colonIndex = legend.textContent.indexOf(':');
                    if (colonIndex !== -1) {
                        return legend.textContent.substring(colonIndex + 2).trim();
                    }
                    return legend.textContent.trim();
                }
            }
        }
        return null;
    }

    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(msg => msg.remove());
        document.querySelectorAll('.input-error').forEach(input => input.classList.remove('input-error'));
    }

    // --- Page Navigation & Display Logic ---
    function updatePageVisibility() {
        clearAllErrors(); 

        formPages.forEach((page, index) => {
            page.style.display = (index + 1) === currentPage ? 'block' : 'none';
        });

        if (currentPageSpan) currentPageSpan.textContent = currentPage;
        
        if (progressBarActual) {
            const progressPercent = (currentPage / totalPages) * 100;
            progressBarActual.style.width = progressPercent + '%';
        }

        if (prevBtn) {
            prevBtn.style.display = (currentPage === 1) ? 'none' : 'inline-block';
            if (currentPage > 1) {
                prevBtn.textContent = `Previous: ${getLegendText(currentPage - 1) || 'Previous Page'}`;
            }
        }

        if (nextBtn) {
            if (currentPage === totalPages) {
                nextBtn.textContent = 'Submit Form';
                nextBtn.id = 'submitBtn'; // Change ID for potential specific styling/handling
            } else {
                nextBtn.textContent = `Next: ${getLegendText(currentPage + 1) || 'Next Page'}`;
                nextBtn.id = 'nextBtn'; // Ensure ID is 'nextBtn' if not last page
            }
        }
    }

    // --- Conditional Field Display Logic ---
    // E-commerce details
    if (ecommerceSelect && ecommerceDetailsGroup) {
        ecommerceSelect.addEventListener('change', function() {
            const showDetails = (this.value === 'yes_full_store' || this.value === 'yes_simple_payments');
            ecommerceDetailsGroup.style.display = showDetails ? 'block' : 'none';
            if (ecommerceDetailsText) { // Make textarea required only if shown
                 if(showDetails) ecommerceDetailsText.setAttribute('required', '');
                 else ecommerceDetailsText.removeAttribute('required');
            }
            if (!showDetails && ecommerceDetailsText) ecommerceDetailsText.value = ''; // Clear if hidden
        });
    }

    // "Main Goals - Other" details
    if (goalOtherToggle && mainGoalsOtherContainer && mainGoalsOtherText) {
        goalOtherToggle.addEventListener('change', function() {
            const showOtherText = this.checked;
            mainGoalsOtherContainer.style.display = showOtherText ? 'block' : 'none';
            if (showOtherText) {
                mainGoalsOtherText.setAttribute('required', '');
                mainGoalsOtherText.focus();
            } else {
                mainGoalsOtherText.removeAttribute('required'); // Corrected typo here
                mainGoalsOtherText.value = '';
                mainGoalsOtherText.classList.remove('input-error');
                const existingError = mainGoalsOtherText.parentElement.querySelector('.error-message');
                if (existingError) existingError.remove();
            }
        });
    }

    // --- Logic for "Website Type - Other" toggle ---
    const websiteTypeSelect = document.getElementById('websiteType');
    const websiteTypeOtherContainer = document.getElementById('websiteTypeOtherContainer');
    const websiteTypeOtherText = document.getElementById('websiteTypeOtherText');

    if (websiteTypeSelect && websiteTypeOtherContainer && websiteTypeOtherText) {
        websiteTypeSelect.addEventListener('change', function() {
            const showOther = (this.value === 'other');
            websiteTypeOtherContainer.style.display = showOther ? 'block' : 'none';
            if (showOther) {
                websiteTypeOtherText.setAttribute('required', '');
                websiteTypeOtherText.focus();
            } else {
                websiteTypeOtherText.removeAttribute('required');
                websiteTypeOtherText.value = '';
                // Clear any error styling if it was applied
                websiteTypeOtherText.classList.remove('input-error');
                const existingError = websiteTypeOtherText.parentElement.querySelector('.error-message');
                if (existingError) existingError.remove();
            }
        });
    } else {
        console.warn("One or more 'Website Type Other' elements not found.");
    }
    // --- END: Logic for "Website Type - Other" toggle ---

    // --- Validation Logic ---
    function validateCurrentPage() {
        clearAllErrors();
        let isValid = true;
        const currentPageFieldset = document.getElementById(`page${currentPage}`);
        if (!currentPageFieldset) return true; // Should not happen

        const requiredFields = currentPageFieldset.querySelectorAll('input[required], select[required], textarea[required]');

        for (let field of requiredFields) {
            let fieldContainer = field.closest('.form-group'); // Check visibility of parent group
            if (fieldContainer && fieldContainer.style.display === 'none') {
                continue; // Skip hidden required fields
            }
            // Special handling for radio/checkbox groups if needed (not currently complex in this form)

            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('input-error');
                const errorSpan = document.createElement('span');
                errorSpan.className = 'error-message';
                let fieldLabel = field.closest('.form-group').querySelector('label');
                let fieldNameForError = (fieldLabel) ? fieldLabel.textContent.replace(':', '').replace('*', '').trim() : (field.name || field.id);
                errorSpan.textContent = `${fieldNameForError} is required.`;
                
                if (field.nextElementSibling && field.nextElementSibling.tagName === 'SMALL') {
                    field.nextElementSibling.insertAdjacentElement('afterend', errorSpan);
                } else {
                    field.insertAdjacentElement('afterend', errorSpan);
                }
            }
        }

        if (!isValid) {
            const firstErrorField = currentPageFieldset.querySelector('.input-error');
            if (firstErrorField) firstErrorField.focus();
        }
        return isValid;
    }

    // --- Data Collection & Submission ---
    function collectAndLogFormData() {
        const collectedData = {};
        
        // Specific handling for "Main Goals"
        let selectedGoals = [];
        document.querySelectorAll('input[name="mainGoals_selected"]:checked').forEach(cb => {
            selectedGoals.push(cb.value);
        });
        if (goalOtherToggle && goalOtherToggle.checked && mainGoalsOtherText && mainGoalsOtherText.value.trim() !== '') {
            selectedGoals.push(`Other: ${mainGoalsOtherText.value.trim()}`);
        }
        if (selectedGoals.length > 0) {
            collectedData['mainGoals'] = selectedGoals;
        } else {
            collectedData['mainGoals'] = ""; // Send empty string if no goals selected
        }

        // Specific handling for "Website Type"
        let finalWebsiteType = websiteTypeSelect ? websiteTypeSelect.value : "";
        if (finalWebsiteType === 'other' && websiteTypeOtherText && websiteTypeOtherText.value.trim() !== '') {
            finalWebsiteType = `Other: ${websiteTypeOtherText.value.trim()}`;
        }
        if (finalWebsiteType) { // Ensure it's not just an empty selection
          collectedData['websiteType'] = finalWebsiteType;
        } else {
          collectedData['websiteType'] = ""; // Or "Not specified"
        }
        console.log(`Collected Website Type:`, collectedData['websiteType']);


        // Generic collection for other fields
        const formElements = document.querySelectorAll('.form-container input, .form-container select, .form-container textarea');
        formElements.forEach(element => {
            const name = element.name;
            const value = element.value;

            if (name && !collectedData.hasOwnProperty(name)) { // Avoid overwriting specifically handled fields
                // Add 'websiteType' and 'websiteTypeOtherText' to the list of fields to skip in generic handling
                if (name === 'mainGoals_selected' || name === 'mainGoals_other_toggle' || name === 'mainGoals_other_text' ||
                    name === 'websiteType' || name === 'websiteTypeOtherText') { // ADDED CHECKS HERE
                    return; 
                }

                if (element.type === 'radio') {
                    if (element.checked) collectedData[name] = value;
                } else if (element.type === 'checkbox' && element.checked) { // Standard checkbox handling
                    if (!collectedData[name]) collectedData[name] = [];
                    collectedData[name].push(value);
                } else if (element.type !== 'checkbox' && element.type !== 'radio') { // All other non-checkbox/radio
                    collectedData[name] = value;
                } else if (element.type === 'checkbox' && !element.checked && !collectedData[name]) {
                    // If a checkbox group might have no selection, ensure key exists if needed by backend
                    // collectedData[name] = []; // Or handle as needed if an empty array is desired for unselected groups
                }
            }
        });
        
        console.log("--- InsightForm AI: Collected Data Object (Ready to Send) ---");
        console.log(collectedData);
        sendDataToBackend(collectedData);
    }

    function sendDataToBackend(data) {
        const submitButton = document.getElementById('submitBtn') || nextBtn; // 'nextBtn' becomes 'submitBtn'

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }
        
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || `Server error! Status: ${response.status}`) });
            }
            return response.json();
        })
        .then(result => {
            console.log("Success/Result from backend:", result);
            if (result.status === 'success') {
                window.location.href = 'thank-you.html';
            } else {
                alert(result.message || "Submission processed, but an issue was reported by the server.");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Form';
                }
            }
        })
        .catch(error => {
            console.error("Error during fetch operation:", error);
            alert(`Submission failed: ${error.message}. Please try again or contact support.`);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Form';
            }
        });
    }

    // --- Event Listeners for Navigation ---
    if (nextBtn) { // nextBtn will also be submitBtn on the last page due to ID change
        nextBtn.addEventListener('click', function () {
            if (!validateCurrentPage()) {
                return; 
            }

            if (currentPage < totalPages) {
                currentPage++;
                updatePageVisibility();
                window.scrollTo(0, 0);
            } else { // Submit Form case
                collectAndLogFormData();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                updatePageVisibility();
                window.scrollTo(0, 0);
            }
        });
    }

    // --- Initial Page Setup ---
    updatePageVisibility(); // Set up the first page correctly
    console.log("InsightForm AI Script Initialized Successfully.");
});