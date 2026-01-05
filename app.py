"""
California Talks - Public Opinion Research
==========================================
Professional polling and research services for candidates and government agencies.
"""

import streamlit as st
from pathlib import Path
from PIL import Image
import requests

# =============================================================================
# PAGE CONFIGURATION
# =============================================================================

# Load favicon from logo
favicon_path = Path(__file__).parent / "assets" / "catalks_bear_favicon.png"
favicon = Image.open(favicon_path) if favicon_path.exists() else "🐻"

# Main logo for hero section
logo_path = Path(__file__).parent / "assets" / "catalks_bear_logo.png"

st.set_page_config(
    page_title="California Talks | Public Opinion Research",
    page_icon=favicon,
    layout="wide",
    initial_sidebar_state="collapsed"
)

# =============================================================================
# CUSTOM CSS
# =============================================================================

st.markdown("""
<style>
    /* Main container */
    .main .block-container {
        padding-top: 2rem;
        max-width: 1200px;
    }
    
    /* Hero section */
    .hero-section {
        text-align: center;
        padding: 2rem 0 3rem 0;
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
        border-radius: 15px;
        margin-bottom: 2rem;
        color: white;
    }
    
    .hero-tagline {
        font-size: 2.5rem;
        font-weight: 700;
        color: #ffd700;
        margin-bottom: 0.5rem;
    }
    
    .hero-subtitle {
        font-size: 1.3rem;
        color: #e0e0e0;
        max-width: 700px;
        margin: 0 auto;
    }
    
    /* Stats section */
    .stat-box {
        background: linear-gradient(135deg, #2d5a87 0%, #1e3a5f 100%);
        border-radius: 10px;
        padding: 1.5rem;
        text-align: center;
        color: white;
        height: 100%;
    }
    
    .stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        color: #ffd700;
    }
    
    .stat-label {
        font-size: 1rem;
        color: #e0e0e0;
    }
    
    /* Service cards */
    .service-card {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 1.5rem;
        height: 100%;
        border-left: 4px solid #2d5a87;
    }
    
    .service-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #1e3a5f;
        margin-bottom: 0.5rem;
    }
    
    .service-desc {
        color: #666;
        font-size: 0.95rem;
    }
    
    /* Press quote */
    .press-quote {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 10px;
        padding: 2rem;
        border-left: 5px solid #ffd700;
        margin: 2rem 0;
    }
    
    .quote-text {
        font-size: 1.2rem;
        font-style: italic;
        color: #333;
        line-height: 1.6;
    }
    
    .quote-source {
        font-size: 0.9rem;
        color: #666;
        margin-top: 1rem;
    }
    
    /* CTA button */
    .cta-section {
        text-align: center;
        padding: 3rem 2rem;
        background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
        border-radius: 15px;
        margin: 2rem 0;
    }
    
    .cta-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 1rem;
    }
    
    .cta-subtitle {
        font-size: 1.1rem;
        color: #333;
        margin-bottom: 1.5rem;
    }
    
    /* Clients section */
    .clients-badge {
        background: #1e3a5f;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        display: inline-block;
        margin: 0.25rem;
        font-size: 0.9rem;
    }
    
    /* Footer */
    .footer {
        text-align: center;
        padding: 2rem;
        color: #666;
        border-top: 1px solid #e0e0e0;
        margin-top: 3rem;
    }
    
    /* Hide Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Explorer section with background image */
    .explorer-link {
        text-decoration: none;
        display: block;
        cursor: pointer;
    }
    
    .explorer-section {
        position: relative;
        border-radius: 15px;
        overflow: hidden;
        margin: 2rem 0;
        min-height: 300px;
    }
    
    .explorer-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        filter: brightness(1);
        z-index: 1;
        transition: filter 0.3s ease;
    }
    
    .explorer-link:hover .explorer-bg {
        filter: brightness(0.4);
    }
    
    .explorer-overlay {
        position: relative;
        z-index: 2;
        padding: 3rem 2rem;
        text-align: center;
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 300px;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .explorer-link:hover .explorer-overlay {
        opacity: 1;
    }
    
    .explorer-title {
        color: #ffd700;
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        text-align: center;
        width: 100%;
    }
    
    .explorer-desc {
        font-size: 1.2rem;
        margin-bottom: 1.5rem;
        max-width: 700px;
        text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
        line-height: 1.6;
        text-align: center;
    }
    
    .explorer-footer {
        font-size: 0.95rem;
        color: #ccc;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)


# =============================================================================
# HERO SECTION
# =============================================================================

col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    # Center the logo using columns
    logo_col1, logo_col2, logo_col3 = st.columns([1, 1, 1])
    with logo_col2:
        if logo_path.exists():
            st.image(str(logo_path), width=200)
    
    st.markdown("""
    <div style="text-align: center;">
        <h1 style="color: #1e3a5f; font-size: 2.8rem; margin-bottom: 0;">California Talks</h1>
        <p class="hero-tagline" style="color: #2d5a87;">Let's Get Talking California</p>
        <p style="font-size: 1.3rem; color: #666; max-width: 600px; margin: 0 auto;">
            We love asking questions, delivering quality data so you can make better decisions.
        </p>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

# =============================================================================
# STATS SECTION
# =============================================================================

st.markdown("### 📊 Trusted Research Partner Since 2018")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="stat-box">
        <div class="stat-number">8+</div>
        <div class="stat-label">Years Experience</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="stat-box">
        <div class="stat-number">58</div>
        <div class="stat-label">CA Counties Covered</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="stat-box">
        <div class="stat-number">100+</div>
        <div class="stat-label">Surveys Conducted</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="stat-box">
        <div class="stat-number">40M</div>
        <div class="stat-label">Californians Represented</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# =============================================================================
# SERVICES SECTION
# =============================================================================

st.markdown("### 🎯 Our Services")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">📋 Public Opinion Polling</div>
        <div class="service-desc">
            Scientifically rigorous surveys that capture what voters and residents really think. 
            From issue polling to candidate matchups.
        </div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">🗳️ Voter Surveys</div>
        <div class="service-desc">
            Targeted voter research with demographic breakdowns by district, 
            party affiliation, and voting history.
        </div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">👥 Focus Groups</div>
        <div class="service-desc">
            In-depth qualitative research to understand the "why" behind the numbers. 
            Moderated discussions with targeted audiences.
        </div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">📊 Policy Research</div>
        <div class="service-desc">
            Data-driven insights for government agencies making policy decisions. 
            Community needs assessments and program evaluations.
        </div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">🎯 Campaign Strategy</div>
        <div class="service-desc">
            Strategic polling and message testing to help campaigns 
            connect with voters and win elections.
        </div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="service-card">
        <div class="service-title">📈 Ballot Measure Research</div>
        <div class="service-desc">
            Initiative and referendum polling to gauge support, 
            test messaging, and track movement over time.
        </div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# =============================================================================
# CLIENTS WE SERVE
# =============================================================================

st.markdown("### 🏛️ Who We Serve")

st.markdown("""
<div style="text-align: center; padding: 1rem;">
    <span class="clients-badge">🏛️ City Council Candidates</span>
    <span class="clients-badge">📚 School Board Candidates</span>
    <span class="clients-badge">🏛️ State Assembly Campaigns</span>
    <span class="clients-badge">🏛️ State Senate Campaigns</span>
    <span class="clients-badge">🇺🇸 Congressional Campaigns</span>
    <span class="clients-badge">🏢 Government Agencies</span>
    <span class="clients-badge">🏙️ Cities & Counties</span>
    <span class="clients-badge">💚 Nonprofits</span>
    <span class="clients-badge">📜 Ballot Measure Campaigns</span>
</div>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# =============================================================================
# PRESS MENTION
# =============================================================================

st.markdown("### 📰 In The News")

st.markdown("""
<div class="press-quote">
    <div class="quote-text">
        "Using a football analogy, the 'oppose the recall' campaign has a huge lead," 
        said <strong>Ali Navid, founder of the Los Angeles-based research firm California Talks</strong>, 
        referencing the new pattern of Democrats voting early. 
        "The 'support the recall' campaign is trying to make a dramatic 4th quarter comeback."
    </div>
    <div class="quote-source">
        — <strong>Orange County Register</strong> | September 14, 2021<br>
        <em>"Recall results: What to expect on election night, and when to expect it"</em>
    </div>
</div>
""", unsafe_allow_html=True)

# =============================================================================
# CENSUS EXPLORER SECTION
# =============================================================================

st.markdown("### 🗺️ Explore California Demographics")

# Load the explorer preview image and convert to base64 for CSS background
import base64
explorer_image_path = Path(__file__).parent / "assets" / "districts_explorer_preview.png"
if explorer_image_path.exists():
    with open(explorer_image_path, "rb") as img_file:
        explorer_img_base64 = base64.b64encode(img_file.read()).decode()
    explorer_bg_style = f"background-image: url('data:image/png;base64,{explorer_img_base64}');"
else:
    explorer_bg_style = "background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);"

st.markdown(f"""
<a href="https://california-districts-explorer.onrender.com/" target="_blank" class="explorer-link">
    <div class="explorer-section">
        <div class="explorer-bg" style="{explorer_bg_style}"></div>
        <div class="explorer-overlay">
            <h3 class="explorer-title">📊 California Districts Explorer</h3>
            <p class="explorer-desc">
                Our interactive data tool provides demographic, socioeconomic, and voter registration 
                data for every Assembly district, Senate district, and County in California.
            </p>
            <p class="explorer-footer">
                Powered by U.S. Census Bureau ACS data • Updated regularly • Free to explore
            </p>
        </div>
    </div>
</a>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# =============================================================================
# CALL TO ACTION
# =============================================================================

st.markdown("""
<div class="cta-section">
    <div class="cta-title">Ready to Make Data-Driven Decisions?</div>
    <div class="cta-subtitle">
        Let's discuss how California Talks can help you understand your voters, 
        test your message, and win your campaign.
    </div>
</div>
""", unsafe_allow_html=True)

# Contact Form
st.markdown("### 📬 Get In Touch")

col1, col2 = st.columns(2)

with col1:
    name = st.text_input("Your Name")
    email = st.text_input("Email Address")
    organization = st.text_input("Organization / Campaign")

with col2:
    service = st.selectbox("What service are you interested in?", [
        "Select a service...",
        "Public Opinion Polling",
        "Voter Survey",
        "Focus Groups",
        "Policy Research",
        "Campaign Strategy",
        "Ballot Measure Research",
        "Other"
    ])
    district = st.text_input("District or Region (optional)")
    message = st.text_area("Tell us about your project", height=100)

col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    if st.button("📧 Send Inquiry", use_container_width=True, type="primary"):
        if name and email and service != "Select a service...":
            # Send email via Formsubmit.co
            form_data = {
                "name": name,
                "email": email,
                "organization": organization if organization else "Not provided",
                "service": service,
                "district": district if district else "Not provided",
                "message": message if message else "No message provided",
                "_subject": f"New Inquiry from {name} - {service}",
                "_template": "table"
            }
            
            try:
                response = requests.post(
                    "https://formsubmit.co/ajax/ali@catalks.org",
                    data=form_data,
                    headers={"Accept": "application/json"}
                )
                
                if response.status_code == 200:
                    st.success("✅ Thank you! Your inquiry has been sent. We'll be in touch within 24 hours.")
                    st.balloons()
                else:
                    st.error("❌ There was an issue sending your message. Please email us directly at ali@catalks.org")
            except Exception as e:
                st.error("❌ Connection error. Please email us directly at ali@catalks.org")
        else:
            st.warning("Please fill in your name, email, and select a service.")

st.markdown("<br>", unsafe_allow_html=True)

# =============================================================================
# CONTACT INFO
# =============================================================================

st.markdown("### 📍 Contact Information")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    **🌐 Website**  
    [www.californiatalks.org](https://www.californiatalks.org)
    """)

with col2:
    st.markdown("""
    **📧 Email**  
    ali@catalks.org
    """)

# =============================================================================
# FOOTER
# =============================================================================

st.markdown("""
<div class="footer">
    <p><strong>California Talks</strong> | Public Opinion Research</p>
    <p>Helping California make better decisions since 2018</p>
    <p style="margin-top: 1rem; font-weight: bold;">© Copyright California Talks LLC - Jan 2026</p>
</div>
""", unsafe_allow_html=True)
