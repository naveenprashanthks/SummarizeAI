document.addEventListener('DOMContentLoaded', function() {
    const videoForm = document.getElementById('video-form');
    const loadingIndicator = document.getElementById('loading');
    const videoSummaryContainer = document.getElementById('video-summary');
    const translationContainer = document.getElementById('translation-container');
    let originalSummaryData = null; // Store the original summary data
    function createSpinnerLoader() {
        loadingIndicator.innerHTML = '';
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            margin: 20px auto;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-left-color: #09f;
            animation: spin 1s linear infinite;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        loadingIndicator.appendChild(spinner);
        
        return function stopAnimation() {
            loadingIndicator.innerHTML = '';
        };
    }

    videoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const videoLink = document.getElementById('video-link').value;
        if (!videoLink) {
            alert('Please enter a YouTube video link');
            return;
        }
        
        loadingIndicator.style.display = 'block';
        if (videoSummaryContainer) videoSummaryContainer.style.display = 'none';
        const stopAnimation = createSpinnerLoader();
        
        try {
            const videoSummary = await fetchVideoSummary(videoLink);
            displayVideoSummary(videoSummary, videoLink);
        } catch (error) {
            console.error('Failed to fetch video summary:', error);
            alert('Failed to fetch video summary. Please try again later.');
        } finally {
            stopAnimation();
            loadingIndicator.style.display = 'none';
            if (videoSummaryContainer) videoSummaryContainer.style.display = 'block';
        }
    });

    async function fetchVideoMetadata(videoLink) {
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoLink)}&format=json`;
            const response = await fetch(oEmbedUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch video metadata: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                title: data.title,
                author: data.author_name,
                channelUrl: data.author_url,
                thumbnailUrl: data.thumbnail_url
            };
        } catch (error) {
            console.warn("Could not fetch video metadata:", error);
            return null;
        }
    }

    async function fetchVideoSummary(videoLink) {
        const API_KEY = "AIzaSyBqk_QkJWvgf95yCJ0JDQLLyXDpOSmm3xs"; // Replace with your actual API key
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;

        if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") {
            console.error("Invalid API key.");
            throw new Error("Invalid API key. Please update the API_KEY.");
        }
        
        // Fetch video metadata to provide context
        const videoMetadata = await fetchVideoMetadata(videoLink);

        try {
            // Create prompt with metadata context if available
            let promptText = `Please analyze the YouTube video at this link: ${videoLink}\n\n`;
            
            if (videoMetadata) {
                promptText += `VIDEO METADATA:\n`;
                promptText += `Title: "${videoMetadata.title}"\n`;
                promptText += `Creator: ${videoMetadata.author}\n`;
                promptText += `Channel URL: ${videoMetadata.channelUrl}\n\n`;
            }
            
            promptText += `IMPORTANT VERIFICATION STEP:\n`;
            promptText += `First, please confirm whether you can access and analyze this specific video content.\n`;
            promptText += `If you CANNOT access the video, please clearly state that you cannot access it and provide only basic metadata information.\n`;
            promptText += `If you CAN access the video, please state "I can access this video" and continue with the detailed analysis.\n\n`;
            
            promptText += `CRITICAL INSTRUCTIONS:\n`;
            promptText += `1. Analyze ONLY the SPECIFIC CONTENT of this PARTICULAR video\n`;
            promptText += `2. DO NOT provide general information about the topic that isn't mentioned in the video\n`;
            promptText += `3. Process the entire video before responding\n`;
            promptText += `4. BE ACCURATE and SPECIFIC to what's actually shown and said in THIS video\n`;
            promptText += `5. Provide detailed explanations for all key points\\n`;
            promptText += `7. If you notice your knowledge about the video seems outdated or incorrect, please state this clearly\n\n`;
            
            promptText += `Format your response as valid JSON:\n`;
            promptText += `{\n`;
            promptText += `    "can_access_video": true/false,\n`;
            promptText += `    "title": "Exact title of the video",\n`;
            promptText += `    "summary": "Brief but comprehensive overview of what the video covers",\n`;
            promptText += `    \"detailed_notes\": [\"First key point with detailed explanation\", \"Second key point with detailed explanation\", ...],\\n`;
            promptText += `    "key_takeaways": ["Most important insight 1", "Most important insight 2", ...]\n`;
            promptText += `}`;
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: promptText
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response structure from API');
            }

            let responseText = data.candidates[0].content.parts?.[0]?.text || '';

            if (!responseText.trim()) {
                throw new Error('Empty response from API');
            }

            try {
                const parsedResponse = JSON.parse(responseText);
                
                // Add warning if model can't access the video
                if (parsedResponse.can_access_video === false) {
                    parsedResponse.summary = "NOTE: The AI could not access this specific video content. " + 
                                            (parsedResponse.summary || "Please verify the video link is correct and publicly accessible.");
                }
                
                return parsedResponse;
            } catch (error) {
                const jsonMatch = responseText.match(/{[\s\S]*}/);
                if (jsonMatch) {
                    try {
                        const parsedResponse = JSON.parse(jsonMatch[0]);
                        // Add warning if model can't access the video
                        if (parsedResponse.can_access_video === false) {
                            parsedResponse.summary = "NOTE: The AI could not access this specific video content. " + 
                                                    (parsedResponse.summary || "Please verify the video link is correct and publicly accessible.");
                        }
                        return parsedResponse;
                    } catch (e) {
                        return { title: "Video Summary", summary: responseText, detailed_notes: [], key_takeaways: [] };
                    }
                }
                return { title: "Video Summary", summary: responseText, detailed_notes: [], key_takeaways: [] };
            }

        } catch (error) {
            console.error("Error fetching video summary:", error);
            throw error;
        }
    }

    function displayVideoSummary(videoSummary, videoLink) {
        try {
            let accessStatus = '';
            if (videoSummary.can_access_video === false) {
                accessStatus = '<div class="access-warning"><strong>⚠️ Note:</strong> The AI could not access the specific video content. Results may be limited to metadata only.</div>';
            }
            
            let detailedNotesHTML = videoSummary.detailed_notes?.length 
                ? `<ul>${videoSummary.detailed_notes.map(note => `<li>${note}</li>`).join('')}</ul>` 
                : '<p>No detailed notes available</p>';

            let takeawaysHTML = videoSummary.key_takeaways?.length 
                ? `<ul>${videoSummary.key_takeaways.map(takeaway => `<li>${takeaway}</li>`).join('')}</ul>` 
                : '<p>No key takeaways available</p>';

            videoSummaryContainer.innerHTML = `
                <h2>${videoSummary.title || 'Video Summary'}</h2>
                <p class="video-link"><strong>Source:</strong> <a href="${videoLink}" target="_blank">${videoLink}</a></p>
                ${accessStatus}
                <div class="summary"><p>${videoSummary.summary || 'No summary available'}</p></div>
                <h3>Detailed Notes</h3>
                ${detailedNotesHTML}
                <h3>Key Takeaways</h3>
                ${takeawaysHTML}
            `;
            
            // Store original summary data for translation
            originalSummaryData = {
                title: videoSummary.title || 'Video Summary',
                summary: videoSummary.summary || 'No summary available',
                detailed_notes: videoSummary.detailed_notes || [],
                key_takeaways: videoSummary.key_takeaways || [],
                videoLink: videoLink,
                accessStatus: accessStatus
            };
            
            // Show translation options after summary is displayed
            translationContainer.style.display = 'block';
        } catch (error) {
            console.error("Error displaying video summary:", error);
            videoSummaryContainer.innerHTML = `
                <h2>Video Summary</h2>
                <div class="error-message">
                    <p>Error displaying the summary. Please try again.</p>
                    <details>
                        <summary>Technical Details</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            `;
        }
    }
    
    // Add event listeners for translation buttons
    translationContainer.addEventListener('click', async function(e) {
        if (e.target.classList.contains('translate-btn')) {
            const language = e.target.dataset.lang;
            
            // Remove active class from all buttons
            document.querySelectorAll('.translate-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            if (language === 'original') {
                // Restore original content
                displayOriginalContent();
            } else {
                await translateContent(language);
            }
        }
    });
    
    function displayOriginalContent() {
        if (!originalSummaryData) return;
        
        let detailedNotesHTML = originalSummaryData.detailed_notes.length 
            ? `<ul>${originalSummaryData.detailed_notes.map(note => `<li>${note}</li>`).join('')}</ul>` 
            : '<p>No detailed notes available</p>';

        let takeawaysHTML = originalSummaryData.key_takeaways.length 
            ? `<ul>${originalSummaryData.key_takeaways.map(takeaway => `<li>${takeaway}</li>`).join('')}</ul>` 
            : '<p>No key takeaways available</p>';
        
        videoSummaryContainer.innerHTML = `
            <h2>${originalSummaryData.title}</h2>
            <p class="video-link"><strong>Source:</strong> <a href="${originalSummaryData.videoLink}" target="_blank">${originalSummaryData.videoLink}</a></p>
            ${originalSummaryData.accessStatus}
            <div class="summary"><p>${originalSummaryData.summary}</p></div>
            <h3>Detailed Notes</h3>
            ${detailedNotesHTML}
            <h3>Key Takeaways</h3>
            ${takeawaysHTML}
        `;
    }
    
    async function translateContent(language) {
        if (!originalSummaryData) return;
        
        // Show loading state
        const previousHTML = videoSummaryContainer.innerHTML;
        videoSummaryContainer.innerHTML = `
            <div class="loading-indicator" style="display:block">
                <div class="spinner"></div>
                <p>Translating to ${language.charAt(0).toUpperCase() + language.slice(1)}...</p>
            </div>
        `;
        
        try {
            const API_KEY = "AIzaSyAbv80bvI5Wad4ZIvzZt8g8MrsMmbNqGtw"; // Using the same API key
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;
            
            // Create content to translate
            const toTranslate = {
                title: originalSummaryData.title,
                summary: originalSummaryData.summary,
                detailed_notes: originalSummaryData.detailed_notes,
                key_takeaways: originalSummaryData.key_takeaways
            };
            
            // Create translation prompt
            const promptText = `
            You are a professional translator. Translate the following content from English to ${language}. 
            The content is a YouTube video summary. Please maintain the exact meaning and structure.
            Return your response in valid JSON format with the translated content:
            
            Content to translate:
            ${JSON.stringify(toTranslate, null, 2)}
            
            Format your response as valid JSON:
            {
                "title": "translated title",
                "summary": "translated summary",
                "detailed_notes": ["translated note 1", "translated note 2", ...],
                "key_takeaways": ["translated takeaway 1", "translated takeaway 2", ...]
            }
            `;
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: promptText
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Translation API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response structure from Translation API');
            }
            
            const responseText = data.candidates[0].content.parts?.[0]?.text || '';
            
            // Extract JSON object from response
            const jsonMatch = responseText.match(/{[\s\S]*}/);
            let translatedData;
            
            if (jsonMatch) {
                translatedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not extract translation data from API response');
            }
            
            // Generate HTML from translated content
            let translatedDetailedNotesHTML = translatedData.detailed_notes?.length 
                ? `<ul>${translatedData.detailed_notes.map(note => `<li>${note}</li>`).join('')}</ul>` 
                : '<p>No detailed notes available</p>';
    
            let translatedTakeawaysHTML = translatedData.key_takeaways?.length 
                ? `<ul>${translatedData.key_takeaways.map(takeaway => `<li>${takeaway}</li>`).join('')}</ul>` 
                : '<p>No key takeaways available</p>';
            
            videoSummaryContainer.innerHTML = `
                <h2>${translatedData.title}</h2>
                <p class="video-link"><strong>Source:</strong> <a href="${originalSummaryData.videoLink}" target="_blank">${originalSummaryData.videoLink}</a></p>
                ${originalSummaryData.accessStatus}
                <div class="summary"><p>${translatedData.summary}</p></div>
                <h3>Detailed Notes</h3>
                ${translatedDetailedNotesHTML}
                <h3>Key Takeaways</h3>
                ${translatedTakeawaysHTML}
            `;
            
        } catch (error) {
            console.error('Translation error:', error);
            videoSummaryContainer.innerHTML = previousHTML;
            alert(`Translation failed: ${error.message}`);
        }
    }
});
