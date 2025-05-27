// Code.gs - InsightForm AI Backend - Final Version

/**
 * Handles HTTP POST requests to the web app.
 * This is the main entry point for form submissions.
 * @param {Object} e - The event parameter containing request data.
 * @return {ContentService.TextOutput} - JSON response indicating success or failure.
 */
function doPost(e) {
  let responseMessage;
  let overallStatus = "success"; // Assume success unless an error occurs that should halt positive feedback

  try {
    Logger.log("doPost initiated. Event received: " + JSON.stringify(e));

    if (!e || !e.postData || !e.postData.contents) {
      Logger.log("Error: No valid postData received.");
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid request: No data received." })).setMimeType(ContentService.MimeType.JSON);
    }

    const jsonDataString = e.postData.contents;
    Logger.log("Received JSON string: " + jsonDataString);
    
    const parsedData = JSON.parse(jsonDataString);
    Logger.log("Parsed data: " + JSON.stringify(parsedData));

    // 1. Store the data in the Google Sheet
    const sheetResponse = storeDataInSheet(parsedData);
    if (!sheetResponse.success) {
      Logger.log("Critical Error: Failed to store data in sheet. " + sheetResponse.message);
      // If storing data fails, it's a significant error.
      overallStatus = "error";
      responseMessage = sheetResponse.message; // Use sheet error message
      // We might not want to proceed with AI or emails if data isn't stored.
      return ContentService.createTextOutput(JSON.stringify({ status: overallStatus, message: responseMessage })).setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log("Data successfully stored in sheet.");

    // 2. Get AI insights, recommendation, AND Brainstormer Prompt
    const freelancerAIOutput = getAIInsights(parsedData); 
    Logger.log("Freelancer AI Output (including Brainstormer Prompt): " + JSON.stringify(freelancerAIOutput));

    // 3. Send email brief TO FREELANCER
    const freelancerEmailResponse = sendEmailBrief(parsedData, freelancerAIOutput);
    if (!freelancerEmailResponse.success) {
      Logger.log("Warning: Failed to send email brief to freelancer. " + freelancerEmailResponse.message);
      // Continue processing even if freelancer email fails, but log it.
    } else {
      Logger.log("Freelancer email brief sent successfully.");
    }

    // 4. Get AI feedback FOR PROSPECT
    const prospectAIFeedback = getAIProspectFeedback(parsedData);
    Logger.log("Prospect AI Feedback: " + prospectAIFeedback);

    // 5. Send confirmation email TO PROSPECT
    if (parsedData.email && parsedData.email.trim() !== "") {
      const prospectEmailResponse = sendProspectConfirmationEmail(parsedData, parsedData.email, prospectAIFeedback);
      if (!prospectEmailResponse.success) {
        Logger.log("Warning: Failed to send confirmation email to prospect. " + prospectEmailResponse.message);
      } else {
        Logger.log("Prospect confirmation email sent successfully.");
      }
    } else {
      Logger.log("Warning: No prospect email provided or it's empty. Skipping prospect confirmation email.");
    }

    responseMessage = "Your information has been submitted successfully!"; // Default success message for frontend

  } catch (error) {
    Logger.log("Critical Error in doPost: " + error.toString() + " Stack: " + error.stack);
    overallStatus = "error";
    responseMessage = "Server error during processing: " + error.toString();
  }

  Logger.log(`Finalizing doPost. Status: ${overallStatus}, Message: ${responseMessage}`);
  return ContentService.createTextOutput(JSON.stringify({ status: overallStatus, message: responseMessage })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Stores the provided data into the designated Google Sheet.
 * @param {Object} data - The form data object.
 * @return {Object} - An object with {success: Boolean, message: String}.
 */
function storeDataInSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    // IMPORTANT: Ensure this is the correct sheet name or index.
    const sheet = spreadsheet.getSheetByName("Sheet1") || spreadsheet.getSheets()[0]; 

    if (!sheet) {
      throw new Error("Target Google Sheet not found.");
    }
    Logger.log("Accessing sheet: " + sheet.getName() + " for data storage.");

    const columnOrder = [
      "clientName", "companyName", "email", "phone", "currentWebsite",
      "projectName", "projectBrief", "mainGoals", "problemSolved", "projectTimeline", "projectBudget", "websiteType",
      "primaryAudience", "audienceNeeds", "audiencePainPoints", "secondaryAudience",
      "visualStyle", "colorPreferences", "typographyPreferences", "inspirationWebsites", "dislikedWebsites", "brandAssets",
      "mustHaveFeatures", "niceToHaveFeatures", "integrations", "ecommerce", "ecommerceDetails", "contentProvision",
      "competitors", "differentiators", "additionalInfo", "referralSource"
    ];

    const rowData = [new Date()]; // Column 1: Timestamp
    columnOrder.forEach(key => {
      let valueToPush = data[key];
      if (key === 'mainGoals' && Array.isArray(valueToPush)) {
        rowData.push(valueToPush.join(', ')); // Join array into a comma-separated string
      } else {
        rowData.push(valueToPush || ""); // Use value or empty string if undefined/null
      }
    });
    
    sheet.appendRow(rowData);
    Logger.log("Row appended to sheet successfully with " + rowData.length + " cells.");
    return { success: true, message: "Data stored successfully in Google Sheet." };

  } catch (error) {
    Logger.log("Error in storeDataInSheet: " + error.toString() + " Stack: " + error.stack);
    return { success: false, message: "Failed to store data in sheet: " + error.toString() };
  }
}

/**
 * Generates AI insights and a recommendation for the freelancer using Gemini API.
 * @param {Object} formData - The client's submitted form data.
 * @return {Object} - An object { insights: String, recommendation: String }.
 */
// Code.gs - Modify getAIInsights

function getAIInsights(formData) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');

    if (!apiKey) {
      Logger.log("Error: GEMINI_API_KEY not found in Script Properties for getAIInsights.");
      return {
        insights: "Error: API Key not configured.",
        recommendation: "N/A - API Key Missing",
        brainstormerPrompt: "Error: API Key not configured. Cannot generate Brainstormer prompt."
      };
    }

    // --- Part 1: Prompt for Freelancer's Insights & Recommendation ---
    let freelancerPromptContent = "You are an expert project analyst reviewing a client's project discovery form. Based on the following information, provide:\n";
    freelancerPromptContent += "1. A concise summary of the project (2-3 sentences).\n";
    freelancerPromptContent += "2. The top 3-4 primary goals identified.\n";
    freelancerPromptContent += "3. 2-3 potential challenges or areas needing further clarification.\n";
    freelancerPromptContent += "4. 1-2 keywords describing the desired visual style/project vibe.\n";
    freelancerPromptContent += "5. As the project analyst, what is your single most important recommendation or next step for the freelancer to take with this prospect?\n\n";
    freelancerPromptContent += "Client Information for Freelancer Brief:\n";
    freelancerPromptContent += `- Project Name: ${formData.projectName || 'Not specified'}\n`;
    freelancerPromptContent += `- Project Brief: ${formData.projectBrief || 'Not specified'}\n`;
    freelancerPromptContent += `- Main Goals: ${(formData.mainGoals && Array.isArray(formData.mainGoals) ? formData.mainGoals.join(', ') : (formData.mainGoals || 'Not specified'))}\n`;
    // Add other key fields as needed for this part of the analysis...
    freelancerPromptContent += `- Target Audience Needs: ${formData.audienceNeeds || 'Not specified'}\n`;
    freelancerPromptContent += `- Must-Have Features: ${formData.mustHaveFeatures || 'Not specified'}\n`;
    freelancerPromptContent += `- Differentiators: ${formData.differentiators || 'Not specified'}\n`;
    freelancerPromptContent += `- Website Type: ${formData.websiteType || 'Not specified'}\n`;


    // --- Part 2: Prompt for "Brainstormer-Ready Prototype Prompt" ---
    // This prompt instructs the AI to synthesize data into a structured format for ME (Brainstormer)
    // It will use formData which ideally includes new fields like userJourneys, sitemapPages etc.
    let brainstormerPromptInstructions = "\n\n-------------------------------------------\n\n";
    brainstormerPromptInstructions += "Now, separately, synthesize the *entire* client submission (including any details on user journeys, sitemap, core messages, CTAs, and constraints if provided) into a 'Brainstormer-Ready Prototype Prompt'. Use the following exact section headings and format:\n\n";
    brainstormerPromptInstructions += "**Brainstormer-Ready Prototype Prompt:**\n\n";
    brainstormerPromptInstructions += "1.  **Project Core Purpose:** (1 concise sentence summarizing the project's absolute essence)\n";
    brainstormerPromptInstructions += `    *Data: Based on '${formData.projectBrief || 'N/A'}' and '${(formData.mainGoals && Array.isArray(formData.mainGoals) ? formData.mainGoals.join(', ') : (formData.mainGoals || 'N/A'))}'*\n\n`;
    
    brainstormerPromptInstructions += "2.  **Primary User & Their Top Goal:** (1-2 sentences describing the main user and what they primarily want to achieve with this project)\n";
    brainstormerPromptInstructions += `    *Data: Based on '${formData.primaryAudience || 'N/A'}' and '${formData.audienceNeeds || 'N/A'}'*\n\n`;

    brainstormerPromptInstructions += "3.  **Critical User Journeys (Top 3, if specified):** (Bulleted list of essential user tasks)\n";
    brainstormerPromptInstructions += `    *Data: '${formData.userJourneys || 'Not specified by client yet. Freelancer to clarify.'}'*\n\n`; // Assumes formData.userJourneys

    brainstormerPromptInstructions += "4.  **Key Website Sections (Sitemap Outline, if specified):** (Bulleted list of main anticipated pages/sections)\n";
    brainstormerPromptInstructions += `    *Data: '${formData.sitemapPages || 'Not specified by client yet. Freelancer to clarify.'}'*\n\n`; // Assumes formData.sitemapPages

    brainstormerPromptInstructions += "5.  **Brand Vibe Keywords:** (3-5 keywords describing the look and feel)\n";
    brainstormerPromptInstructions += `    *Data: Based on '${formData.visualStyle || 'N/A'}' and inspiration/dislikes: '${formData.inspirationWebsites || ''} / ${formData.dislikedWebsites || ''}'*\n\n`;

    brainstormerPromptInstructions += "6.  **Homepage Core Message & CTA (if specified):**\n";
    brainstormerPromptInstructions += `    *Core Message: '${formData.homepageCoreMessage || 'Not specified by client yet.'}'*\n`; // Assumes formData.homepageCoreMessage
    brainstormerPromptInstructions += `    *Primary CTA: '${formData.homepagePrimaryCTA || 'Not specified by client yet.'}'*\n\n`;   // Assumes formData.homepagePrimaryCTA

    brainstormerPromptInstructions += "7.  **Unique Value Proposition (UVP):** (1 sentence on what makes this project stand out)\n";
    brainstormerPromptInstructions += `    *Data: Based on '${formData.differentiators || 'N/A - Needs clarification.'}'*\n\n`;

    brainstormerPromptInstructions += "8.  **Key Constraint or Non-Negotiable (if any clear one specified):** (e.g., Must be a Single Page Application. Website type: " + (formData.websiteType || 'N/A') + ")\n";
    brainstormerPromptInstructions += `    *Data: Based on '${formData.integrations || 'None specified'}' or '${formData.additionalInfo || 'None specified'}'*\n`;
    brainstormerPromptInstructions += "\nProvide only the content for these 8 sections under the 'Brainstormer-Ready Prototype Prompt:' heading.\n";


    // Combine prompts or make two separate calls. For simplicity and better control,
    // let's assume the AI can handle both parts in one call if structured well.
    // Or, you could make two API calls if responses get muddled.
    // For now, trying one call with clear separation in the prompt.
    const fullPromptForAI = freelancerPromptContent + brainstormerPromptInstructions;

    Logger.log("Combined Prompt for AI (Freelancer Insights + Brainstormer Prompt Instructions): " + fullPromptForAI);

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: fullPromptForAI }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } // Increased max tokens
    };
    const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };

    const response = UrlFetchApp.fetch(geminiApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(responseBody);
      let freelancerInsightsText = "AI could not generate insights for freelancer.";
      let freelancerRecommendationText = "AI recommendation for freelancer not available.";
      let brainstormerPromptText = "Brainstormer-Ready Prototype Prompt could not be generated.";

      if (jsonResponse.candidates && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts[0].text) {
        const fullResponseText = jsonResponse.candidates[0].content.parts[0].text;
        
        // Attempt to split the full response into the three parts
        const brainstormerPromptMarker = "**Brainstormer-Ready Prototype Prompt:**";
        const freelancerRecommendationKeyword = "recommendation"; // Or other keywords used for splitting

        let brainstormerPromptStartIndex = fullResponseText.indexOf(brainstormerPromptMarker);
        
        if (brainstormerPromptStartIndex !== -1) {
          let freelancerTextPart = fullResponseText.substring(0, brainstormerPromptStartIndex).trim();
          brainstormerPromptText = fullResponseText.substring(brainstormerPromptStartIndex + brainstormerPromptMarker.length).trim();
          
          // Now split freelancerTextPart into insights and recommendation
          let recSplitIndex = -1;
          let recKeywords = ["recommendation:", "next step for the freelancer:"]; // Add more robust keywords
          for(const keyword of recKeywords) {
              let tempIndex = freelancerTextPart.toLowerCase().lastIndexOf(keyword);
              if(tempIndex !== -1) {
                  // Try to get to the beginning of the sentence/paragraph
                  let sentenceStart = freelancerTextPart.substring(0, tempIndex).lastIndexOf('\n') +1;
                  if (sentenceStart === 0 && tempIndex > 50) sentenceStart = tempIndex;
                  recSplitIndex = sentenceStart;
                  break;
              }
          }

          if (recSplitIndex !== -1) {
            freelancerInsightsText = freelancerTextPart.substring(0, recSplitIndex).trim();
            freelancerRecommendationText = freelancerTextPart.substring(recSplitIndex).trim();
          } else {
            freelancerInsightsText = freelancerTextPart; // All of it is insights if no recommendation split
          }

        } else {
          // Fallback if Brainstormer prompt marker isn't found - try to get freelancer insights/rec at least
          let recSplitIndex = -1;
          // ... (similar split logic for freelancer insights/rec as above) ...
          // For brevity, assuming the above split worked or needs refinement based on actual AI output
           freelancerInsightsText = fullResponseText; // Or apply previous split logic
        }

        Logger.log("Extracted Freelancer Insights: \n" + freelancerInsightsText);
        Logger.log("Extracted Freelancer Recommendation: \n" + freelancerRecommendationText);
        Logger.log("Generated Brainstormer-Ready Prototype Prompt: \n" + brainstormerPromptText);

        return { 
          insights: freelancerInsightsText, 
          recommendation: freelancerRecommendationText, 
          brainstormerPrompt: brainstormerPromptText 
        };

      } else if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
        const blockMessage = `AI analysis was blocked. Reason: ${jsonResponse.promptFeedback.blockReason}.`;
        return { insights: blockMessage, recommendation: "N/A - Analysis Blocked", brainstormerPrompt: "N/A - Analysis Blocked" };
      }
      // Fallback if no candidates
      return { insights: freelancerInsightsText, recommendation: freelancerRecommendationText, brainstormerPrompt: brainstormerPromptText };
    } else {
      Logger.log(`Error calling Gemini API: ${responseCode} - ${responseBody}`);
      const errorMessage = `Error from AI service (${responseCode}).`;
      return { insights: errorMessage, recommendation: "N/A - AI Service Error", brainstormerPrompt: "N/A - AI Service Error" };
    }
  } catch (error) {
    Logger.log("Error in getAIInsights: " + error.toString() + " Stack: " + error.stack);
    const scriptErrorMessage = "Error generating AI insights: " + error.toString();
    return { insights: scriptErrorMessage, recommendation: "N/A - Script Error", brainstormerPrompt: "N/A - Script Error" };
  }
}

/**
 * Generates short, positive AI feedback for the prospect using Gemini API.
 * @param {Object} formData - The client's submitted form data.
 * @return {String} - The AI-generated feedback string.
 */
function getAIProspectFeedback(formData) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');

    if (!apiKey) {
      Logger.log("Error: GEMINI_API_KEY not found for prospect feedback.");
      return "Thank you for your submission! We're excited to review your project details.";
    }

    let promptContent = "A potential client has just submitted their project details. Based on their project name and main goal, provide a single, short (1-2 sentences maximum), positive, and encouraging acknowledgment that makes them feel good about their submission. Focus on acknowledging their vision or a key aspect they mentioned. Do NOT give advice, critique their ideas, make commitments, or ask questions. Simply acknowledge their input warmly.\n\n";
    promptContent += `Client's Project Name: ${formData.projectName || 'their exciting new project'}\n`;
    promptContent += `Client's Main Goal for the project: ${(formData.mainGoals && Array.isArray(formData.mainGoals) ? formData.mainGoals.join(', ') : (formData.mainGoals || 'achieving great things'))}\n\n`;
    promptContent += "Example Acknowledgment: We're thrilled to see your vision for [Project Name] and your clear focus on [Main Goal]! It's a great starting point.\n";
    promptContent += "Another Example: Thank you for sharing the details for [Project Name]! Your goal to [Main Goal] sounds very promising.\n";
    promptContent += "Provide only the acknowledgment message itself, without any introductory phrases like 'Here's an acknowledgment:'.";


    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: promptContent }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 100 }
    };
    const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };

    Logger.log("Sending request to Gemini API for prospect feedback. Prompt length: " + promptContent.length);
    const response = UrlFetchApp.fetch(geminiApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(responseBody);
      if (jsonResponse.candidates && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts[0].text) {
        let feedback = jsonResponse.candidates[0].content.parts[0].text.trim();
        if (feedback.toLowerCase().startsWith("acknowledgment:")) feedback = feedback.substring("acknowledgment:".length).trim();
        return feedback;
      } else if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
          Logger.log("Prompt for prospect feedback was blocked. Reason: " + jsonResponse.promptFeedback.blockReason);
          return `Thank you for your detailed submission! We've received it and will be in touch soon.`;
      } else {
        Logger.log("Could not extract text from Gemini response for prospect feedback.");
        return "Thank you for your submission! We're looking forward to reviewing your details.";
      }
    } else {
      Logger.log(`Error calling Gemini API for prospect feedback: ${responseCode} - ${responseBody}`);
      return "Thank you for your submission! Your project details have been received.";
    }
  } catch (error) {
    Logger.log("Error in getAIProspectFeedback: " + error.toString() + " Stack: " + error.stack);
    return "Thank you for submitting your project information!";
  }
}

/**
 * Sends an enhanced HTML email brief to the freelancer.
 * @param {Object} formData - The client's submitted form data.
 * @param {Object} aiOutput - An object containing {insights, recommendation}.
 * @return {Object} - An object with {success: Boolean, message: String}.
 */
// In Code.gs - Modify the sendEmailBrief function

function sendEmailBrief(formData, aiOutput) { // aiOutput is now { insights, recommendation, brainstormerPrompt }
  try {
    const recipientEmail = "AugmentedDev@outlook.com"; // Updated freelancer email
    const clientName = formData.clientName || "N/A";
    const projectName = formData.projectName || "N/A";
    const subject = `🚀 SmartInsight AI Brief & Prototype Prompt: ${clientName} - ${projectName}`; // Updated Subject

    // Destructure AI output
    const aiInsights = aiOutput.insights || "No AI insights generated.";
    const aiRecommendation = aiOutput.recommendation || "No specific AI recommendation provided.";
    const brainstormerPrompt = aiOutput.brainstormerPrompt || "Brainstormer-Ready Prototype Prompt could not be generated.";

    let htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* ... Your existing beautiful email CSS ... */
        body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; }
        .email-container { max-width: 680px; margin: 20px auto; background-color: #ffffff; padding: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #007bff; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 25px 30px; color: #333333; line-height: 1.6; font-size: 15px; }
        .content h2 { font-size: 20px; color: #007bff; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #007bff; padding-bottom: 5px;}
        .content h3 { font-size: 17px; color: #333; margin-top: 20px; margin-bottom: 8px; }
        .data-pair { margin-bottom: 12px; }
        .data-pair strong { color: #555555; min-width: 180px; display: inline-block; }
        .ai-section { background-color: #e9f5ff; border-left: 5px solid #007bff; padding: 15px 20px; margin-top: 20px; margin-bottom: 20px; border-radius: 5px;}
        .ai-section h3 { color: #0056b3; margin-top: 0; }
        .ai-section p, .ai-section ul { white-space: pre-wrap; margin-bottom: 10px; }
        .recommendation { background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px 20px; margin-top: 10px; border-radius: 5px;}
        .recommendation h3 { color: #856404; margin-top: 0;}
        .brainstormer-prompt-section { background-color: #f0f0f0; border-left: 5px solid #6c757d; padding: 15px 20px; margin-top: 20px; margin-bottom: 20px; border-radius: 5px; white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; font-size: 14px;}
        .brainstormer-prompt-section h3 { color: #343a40; margin-top: 0; font-family: Arial, sans-serif;} /* Reset font for heading */
        .full-data-section ul { list-style-type: none; padding-left: 0; }
        .full-data-section li { margin-bottom: 8px; border-bottom: 1px dotted #eeeeee; padding-bottom: 8px; }
        .footer { background-color: #333333; color: #cccccc; text-align: center; padding: 20px; font-size: 12px; }
        .footer a { color: #007bff; text-decoration: none; }
        hr { border: 0; border-top: 1px solid #e0e0e0; margin: 25px 0; }
      </style>
    </head>
    <body>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td>
      <div class="email-container">
        <div class="header">
          <h1>SmartInsight AI Brief</h1>
        </div>
        <div class="content">
          <h2>Client & Project Snapshot</h2>
          <div class="data-pair"><strong>Client Name:</strong> ${formData.clientName||'N/A'}</div>
          <div class="data-pair"><strong>Company:</strong> ${formData.companyName||'N/A'}</div>
          <div class="data-pair"><strong>Email:</strong> ${formData.email||'N/A'}</div>
          <div class="data-pair"><strong>Project Name:</strong> ${formData.projectName||'N/A'}</div>

          <hr>

          <h2>AI-Powered Insights & Recommendation</h2>
          <div class="ai-section">
            <h3>Key Analysis & Observations:</h3>
            <p>${aiInsights.replace(/\n/g,'<br>')}</p>
          </div>
          <div class="recommendation">
            <h3>AI Top Recommendation for You:</h3>
            <p>${aiRecommendation.replace(/\n/g,'<br>')}</p>
          </div>

          <hr>

          <h2>🚀 Brainstormer-Ready Prototype Prompt:</h2>
          <div class="brainstormer-prompt-section">
            <h3>Copy this entire section for Brainstormer:</h3>
            <p>${brainstormerPrompt.replace(/\n/g,'<br>')}</p>
          </div>
          <hr>
          
          <h2>Key Project Details Submitted</h2>
          <h3>Project Vision</h3>
          <div class="data-pair"><strong>Project Brief:</strong><br>${(formData.projectBrief||'N/A').replace(/\n/g,'<br>')}</div>
          <div class="data-pair"><strong>Main Goals:</strong><br>${(formData.mainGoals && Array.isArray(formData.mainGoals) ? formData.mainGoals.join(', ') : (formData.mainGoals || 'N/A')).replace(/\n/g,'<br>')}</div>
          <div class="data-pair"><strong>Problem Solved:</strong><br>${(formData.problemSolved||'N/A').replace(/\n/g,'<br>')}</div>
          
          <h3>Target Audience</h3>
          <div class="data-pair"><strong>Primary Audience:</strong><br>${(formData.primaryAudience||'N/A').replace(/\n/g,'<br>')}</div>
          <div class="data-pair"><strong>Audience Needs:</strong><br>${(formData.audienceNeeds||'N/A').replace(/\n/g,'<br>')}</div>

          <h3>Design & Features</h3>
          <div class="data-pair"><strong>Desired Visual Style:</strong> ${formData.visualStyle||'N/A'}</div>
          <div class="data-pair"><strong>Must-Have Features:</strong><br>${(formData.mustHaveFeatures||'N/A').replace(/\n/g,'<br>')}</div>


          <hr>
          
          <h2>Full Form Data</h2>
          <div class="full-data-section"><ul>`;
    const columnOrder = [ /* ... your full columnOrder array ... */ 
      "clientName", "companyName", "email", "phone", "currentWebsite", "projectName", "projectBrief", 
      "mainGoals", "problemSolved", "projectTimeline", "projectBudget", "primaryAudience", "audienceNeeds", 
      "audiencePainPoints", "secondaryAudience", "visualStyle", "colorPreferences", "typographyPreferences", 
      "inspirationWebsites", "dislikedWebsites", "brandAssets", "mustHaveFeatures", "niceToHaveFeatures", 
      "integrations", "ecommerce", "ecommerceDetails", "contentProvision", "competitors", "differentiators", 
      "additionalInfo", "referralSource",
      // Add new field names here if you added them to the form for userJourneys, sitemapPages etc.
      "userJourneys", "sitemapPages", "homepageCoreMessage", "homepagePrimaryCTA" 
    ];
    columnOrder.forEach(key => {
        let value = formData[key];
        if (value !== undefined && value !== null && value.toString().trim() !== "") { // Check for undefined/null too
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (Array.isArray(value)) value = value.join(', ');
            htmlBody += `<li><strong>${label}:</strong> ${value.toString().replace(/\n/g,'<br>')}</li>`;
        }
    });
    htmlBody += `</ul></div></div>
        <div class="footer">
          This brief was automatically generated by SmartInsight AI.<br> 
          &copy; ${new Date().getFullYear()} Your Name/Company
        </div>
      </div>
      <div class="data-pair"><strong>Website Type:</strong> ${formData.websiteType || 'N/A'}</div>
      </td></tr></table>
    </body>
    </html>`;

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
    });

    Logger.log(`Enhanced freelancer email with Brainstormer Prompt sent to ${recipientEmail}`);
    return { success: true, message: "Email sent." };

  } catch (error) {
    Logger.log("Error in sendEmailBrief: " + error.toString() + " Stack: " + error.stack);
    return { success: false, message: "Failed to send email: " + error.toString() };
  }
}

// Ensure your doPost function is updated to handle the object from getAIInsights
// and pass it to sendEmailBrief correctly:
// Inside doPost:
// const freelancerAIOutput = getAIInsights(parsedData); // freelancerAIOutput is { insights, recommendation, brainstormerPrompt }
// Logger.log("Freelancer AI Output: " + JSON.stringify(freelancerAIOutput));
// const freelancerEmailResponse = sendEmailBrief(parsedData, freelancerAIOutput);

/**
 * Sends an HTML confirmation email to the prospect.
 * @param {Object} formData - The client's submitted form data.
 * @param {String} prospectEmail - The prospect's email address.
 * @param {String} aiProspectFeedback - The AI-generated feedback for the prospect.
 * @return {Object} - An object with {success: Boolean, message: String}.
 */
function sendProspectConfirmationEmail(formData, prospectEmail, aiProspectFeedback) {
  try {
    const subject = `Thank You for Your Project Submission - ${formData.projectName || 'Project Inquiry'}`;
    const theirName = formData.clientName || "Valued Prospect";

    let htmlBody = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;margin:0;padding:0;background-color:#f0f2f5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    .email-wrapper{max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.07)}
    .header{background:linear-gradient(135deg,#007bff 0%,#0056b3 100%);color:#fff;padding:40px 30px;text-align:center}
    .header img{max-width:150px;margin-bottom:10px}
    .header h1{margin:0;font-size:26px;font-weight:600}
    .content{padding:30px 35px;color:#3a3a3a;line-height:1.65;font-size:16px}
    .content p{margin:0 0 15px 0}
    .ai-feedback-section{background-color:#e6f7ff;border:1px solid #b3e0ff;border-left-width:5px;border-left-color:#007bff;padding:20px;margin:25px 0;border-radius:5px}
    .ai-feedback-section p{margin:0;font-style:italic;color:#0056b3}
    .next-steps-section{margin-top:25px;padding-top:20px;border-top:1px solid #e9e9e9}
    .next-steps-section h2{font-size:18px;color:#007bff;margin-bottom:15px}
    .next-steps-section ul{list-style:none;padding:0}
    .next-steps-section li{margin-bottom:10px;padding-left:25px;position:relative}
    .next-steps-section li::before{content:'✓';color:#007bff;position:absolute;left:0;font-weight:700}
    .button-cta{display:block;width:-moz-max-content;width:max-content;margin:30px auto 10px auto;background-color:#007bff;color:#fff;padding:14px 28px;text-decoration:none;border-radius:5px;font-weight:700;font-size:16px;text-align:center}
    .button-cta:hover{background-color:#0056b3}
    .footer{text-align:center;padding:25px;font-size:13px;color:#888}
    .footer a{color:#007bff;text-decoration:none}
    @media screen and (max-width:600px){.content{padding:20px 25px}.header{padding:30px 20px}.ai-feedback-section{padding:15px}}
    </style></head><body><div class="email-wrapper">
    <div class="header"><h1>Submission Confirmed!</h1></div>
    <div class="content">
    <p>Hello ${theirName},</p>
    <p>Thank you for reaching out and submitting your project details for <strong>${formData.projectName||'your new project'}</strong> through InsightForm AI! We've successfully received your information.</p>
    <div class="ai-feedback-section"><p>"${aiProspectFeedback}"</p><p style="text-align:right;font-size:0.9em;margin-top:10px;color:#0067cc"><em>– InsightAI Assistant</em></p></div>
    <p>We're excited to learn more about your vision.</p>
    <div class="next-steps-section"><h2>What Happens Next?</h2><ul>
    <li>Our team will carefully review your submission.</li>
    <li>You can expect to hear from us within <strong>1-2 business days</strong> to discuss your project in more detail.</li>
    <li>If you have any immediate questions, feel free to reply to this email (if applicable).</li>
    </ul></div></div>
    <div class="footer">&copy; ${new Date().getFullYear()} The Augmented Developer. All rights reserved.</div>
    </div></body></html>`;

    MailApp.sendEmail({
      to: prospectEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: "SmartInsight AI" // Sender Name
    });
    Logger.log(`Prospect confirmation email sent successfully to ${prospectEmail}`);
    return { success: true, message: "Prospect confirmation email sent." };
  } catch (error) {
    Logger.log("Error in sendProspectConfirmationEmail: " + error.toString() + " Stack: " + error.stack);
    return { success: false, message: "Failed to send prospect confirmation email: " + error.toString() };
  }
}