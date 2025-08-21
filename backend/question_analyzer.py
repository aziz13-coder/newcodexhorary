from typing import Dict, Any, List
import re
import logging

try:
    from .taxonomy import Category
except ImportError:  # pragma: no cover - fallback for script execution
    from taxonomy import Category

logger = logging.getLogger(__name__)


class TraditionalHoraryQuestionAnalyzer:
    """Analyze questions using traditional horary house assignments"""
    
    def __init__(self):
        # Traditional house meanings for horary
        self.house_meanings = {
            1: ["querent", "self", "body", "life", "personality", "appearance"],
            2: ["money", "possessions", "moveable goods", "income", "resources", "values"],
            3: ["siblings", "neighbors", "short journeys", "communication", "letters", "rumors"],
            4: ["father", "home", "land", "property", "endings", "foundations", "graves"],
            5: ["children", "pregnancy", "pleasure", "gambling", "creativity", "entertainment"],
            6: ["illness", "servants", "small animals", "work", "daily routine", "uncle/aunt"],
            7: ["spouse", "partner", "open enemies", "thieves", "others", "contracts"],
            8: ["death", "partner's money", "wills", "transformation", "fear", "surgery"],
            9: ["long journeys", "foreign lands", "religion", "law", "higher learning", "dreams"],
            10: ["mother", "career", "honor", "reputation", "authority", "government"],
            11: ["friends", "hopes", "wishes", "advisors", "king's money", "groups"],
            12: ["hidden enemies", "large animals", "prisons", "secrets", "self-undoing", "witchcraft"]
        }
        
        # ENHANCED: Comprehensive traditional horary question patterns
        self.question_patterns = {
            Category.LOST_OBJECT: ["where is", "lost", "missing", "find", "stolen", "disappeared", "locate"],
            Category.MARRIAGE: ["marry", "wedding", "spouse", "husband", "wife", "engagement", "propose"],
            Category.PREGNANCY: ["pregnant", "conceive", "conception", "expecting", "baby", "fertility"],
            Category.CHILDREN: ["child", "children", "son", "daughter", "offspring", "kids"],
            Category.TRAVEL: ["journey", "travel", "trip", "go to", "visit", "vacation", "move to"],
            Category.GAMBLING: ["lottery", "lotto", "win lottery", "jackpot", "scratch", "raffle", "betting", "bet", "gamble", "gambling", "casino", "poker", "blackjack", "slots", "dice", "win money", "lucky", "speculation"],
            Category.FUNDING: ["funding", "fund", "investment", "invest", "investor", "funding round", "seed", "series a", "series b", "venture capital", "vc", "angel", "capital", "raise money", "raise capital", "secure funding", "startup funding", "business loan", "loan", "loan application", "finance", "financial backing", "sponsor", "grant", "equity", "valuation"],
            Category.MONEY: ["money", "wealth", "rich", "profit", "gain", "debt", "financial", "income", "salary", "pay", "trading", "stock", "loan", "loan application"],
            Category.CAREER: ["job", "career", "work", "employment", "business", "promotion", "interview"],
            Category.HEALTH: ["sick", "illness", "disease", "health", "recover", "die", "cure", "healing", "medical"],
            Category.LAWSUIT: ["court", "lawsuit", "legal", "judge", "trial", "litigation", "case"],
            Category.RELATIONSHIP: ["love", "relationship", "friend", "enemy", "romance", "dating", "go out", "go out with", "date", "ask out", "see each other", "like me", "interested in", "attracted to", "reconciliation", "reconcile", "get back together", "ex", "former", "past relationship", "breakup", "break up", "makeup", "make up", "together", "couple", "partner", "boyfriend", "girlfriend", "romantic", "crush", "feelings", "attraction"],
            # NEW: Education and learning patterns
            Category.EDUCATION: [
                "exam", "test", "study", "student", "school", "college", "university", "learn", "pass", "graduate", "degree", "education", "academic", "course", "class", "conference", "paper", "publication", "publish", "journal", "research", "submit", "accepted", "peer review", "review", "presentation", "symposium", "seminar", "physiotherapy", "nursing", "medical", "certification", "admission", "admit", "admitted", "enroll", "enrolled", "enrollment", "program", "master", "masters"
            ],
            # NEW: Specific person relationship patterns
            Category.PARENT: ["father", "mother", "dad", "mom", "parent", "stepfather", "stepmother"],
            Category.SIBLING: ["brother", "sister", "sibling"],
            Category.FRIEND_ENEMY: ["friend", "enemy", "ally", "rival", "competitor"],
            # NEW: Property and housing
            Category.PROPERTY: ["house", "home", "property", "real estate", "land", "apartment", "buy house", "sell house"],
            # NEW: Death and inheritance
            Category.DEATH: ["death", "die", "inheritance", "testament", "legacy", "last will", "will and testament"],
            # NEW: Spiritual and religious
            Category.SPIRITUAL: ["god", "religion", "spiritual", "prayer", "divine", "faith", "church"],
        }
        
        # Person keywords mapped to their traditional houses
        self.person_keywords = {
            4: ["father", "dad", "grandfather", "stepfather"],
            10: ["mother", "mom", "mum", "stepmother"],
            7: ["spouse", "husband", "wife", "partner"],
            3: ["brother", "sister", "sibling"],
            5: ["child", "son", "daughter", "baby"],
            11: ["friend", "ally", "benefactor"]
        }
    
    def _turn(self, base: int, offset: int) -> int:
        """Return the house offset steps from base (1-based)."""
        return ((base + offset - 1) % 12) + 1
    
    # NOTE: Duplicate methods removed - using enhanced versions below
    
    def _parse_question_timeframe(self, question: str) -> Dict[str, Any]:
        """Parse timeframe constraints from question text"""
        import re
        from datetime import datetime, timedelta
        import calendar
        
        timeframe_patterns = {
            "this_month": [r"this month", r"by the end of this month", r"within this month"],
            "next_month": [r"next month", r"by next month"],
            "this_year": [r"this year", r"by the end of this year", r"within this year"], 
            "this_week": [r"this week", r"by the end of this week", r"within this week"],
            "today": [r"today", r"by today", r"by the end of today"],
            "soon": [r"soon", r"quickly", r"fast"],
            "by_date": [r"by (\w+ \d+)", r"before (\w+ \d+)"],
            "specific_month": [
                r"in (january|february|march|april|may|june|july|august|september|october|november|december)"
            ],
            # NEW: Numeric timeframes
            "within_days": [r"within (\d+) days?", r"in (\d+) days?"],
            "within_weeks": [r"within (\d+) weeks?", r"in (\d+) weeks?"],
            "within_months": [r"within (\d+) months?", r"in (\d+) months?"],
            "by_numeric_date": [r"by (\d{4}-\d{2}-\d{2})", r"before (\d{4}-\d{2}-\d{2})"],
        }
        
        detected_timeframes = []
        numeric_extracts = {}  # Store captured numeric values
        
        for timeframe_type, patterns in timeframe_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, question, re.IGNORECASE)
                if match:
                    detected_timeframes.append(timeframe_type)
                    # Extract numeric values for numeric patterns
                    if match.groups():
                        numeric_extracts[timeframe_type] = match.groups()
                    break
        
        if not detected_timeframes:
            return {"has_timeframe": False, "type": None, "end_date": None, "window_days": None}
        
        # Calculate end date and window_days for timeframes
        now = datetime.now()
        end_date = None
        window_days = None
        
        # Handle numeric timeframes first (higher priority)
        if "within_days" in detected_timeframes and "within_days" in numeric_extracts:
            days = int(numeric_extracts["within_days"][0])
            window_days = days
            end_date = now + timedelta(days=days)
        elif "within_weeks" in detected_timeframes and "within_weeks" in numeric_extracts:
            weeks = int(numeric_extracts["within_weeks"][0])
            window_days = weeks * 7
            end_date = now + timedelta(weeks=weeks)
        elif "within_months" in detected_timeframes and "within_months" in numeric_extracts:
            months = int(numeric_extracts["within_months"][0])
            window_days = months * 30  # Approximate
            end_date = now + timedelta(days=window_days)
        elif "by_numeric_date" in detected_timeframes and "by_numeric_date" in numeric_extracts:
            date_str = numeric_extracts["by_numeric_date"][0]
            try:
                end_date = datetime.strptime(date_str, "%Y-%m-%d")
                window_days = (end_date - now).days
            except ValueError:
                pass
        elif "this_month" in detected_timeframes:
            # End of current month
            if now.month == 12:
                end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
            window_days = (end_date - now).days
        elif "this_week" in detected_timeframes:
            # End of current week (Sunday)
            days_until_sunday = (6 - now.weekday()) % 7
            end_date = now + timedelta(days=days_until_sunday)
            window_days = days_until_sunday
        elif "today" in detected_timeframes:
            end_date = now.replace(hour=23, minute=59, second=59)
            window_days = 1
        elif "specific_month" in detected_timeframes:
            # End of referenced month in current year
            match = re.search(
                timeframe_patterns["specific_month"][0], question, re.IGNORECASE
            )
            if match:
                month_str = match.group(1).lower()
                month_numbers = {
                    "january": 1,
                    "february": 2,
                    "march": 3,
                    "april": 4,
                    "may": 5,
                    "june": 6,
                    "july": 7,
                    "august": 8,
                    "september": 9,
                    "october": 10,
                    "november": 11,
                    "december": 12,
                }
                month_num = month_numbers[month_str]
                last_day = calendar.monthrange(now.year, month_num)[1]
                end_date = datetime(now.year, month_num, last_day)
                window_days = (end_date - now).days

        # Fallback window_days if not calculated
        if window_days is None and end_date:
            window_days = (end_date - now).days

        return {
            "has_timeframe": True,
            "type": detected_timeframes[0],  # Use first match
            "end_date": end_date,
            "window_days": window_days,
            "patterns_matched": detected_timeframes
        }
    
    def analyze_question(self, question: str) -> Dict[str, Any]:
        """Analyze question to determine significators using traditional methods"""

        question_lower = question.lower()

        # Detect post-event phrasing (e.g., "just took", "already did")
        post_event = bool(
            re.search(r"(just|already)\s+(took|did|submitted|happened)", question_lower)
        )

        # ENHANCEMENT: Detect 3rd person questions requiring house turning
        third_person_analysis = self._detect_third_person_question(question_lower)
        
        # ENHANCEMENT: Parse timeframe from question
        timeframe_analysis = self._parse_question_timeframe(question_lower)
        
        # Determine question type
        question_type, matched_pattern = self._determine_question_type(question_lower)

        # Determine primary houses involved (with house turning if needed)
        houses, possession_analysis = self._determine_houses(question_lower, question_type, third_person_analysis)

        # Determine significators
        significators = self._determine_significators(houses, question_type, possession_analysis, third_person_analysis)

        # DEBUG: Emit classification traceability information
        logger.debug(
            "category=%s, matched=%s, houses=%s",
            question_type.value,
            matched_pattern,
            houses,
        )

        return {
            "question_type": question_type,
            "relevant_houses": houses,
            "significators": significators,
            "third_person_analysis": third_person_analysis,
            "timeframe_analysis": timeframe_analysis,
            "traditional_analysis": True,
            "post_event": post_event,
        }
    
    def _apply_house_derivation(self, base_house: int, derived_house: int) -> int:
        """Apply traditional house derivation rules (house from house)"""
        # Convert to 0-based indexing, apply derivation, convert back
        result = ((base_house - 1 + derived_house - 1) % 12) + 1
        return result
    
    def _detect_third_person_question(self, question: str) -> Dict[str, Any]:
        """Detect if question is about someone else requiring house turning"""
        
        import re

        # Strong 3rd person indicators
        third_person_patterns = [
            # Direct pronouns
            r"\bwill he\b", r"\bwill she\b", r"\bwill they\b",
            r"\bdid he\b", r"\bdid she\b",
            r"\bhas he\b", r"\bhas she\b",
            r"\bdoes he\b", r"\bdoes she\b",
            r"\bcan he\b", r"\bcan she\b",
            r"\bshould he\b", r"\bshould she\b",
            r"\bis he\b", r"\bis she\b", r"\bis they\b",
            # Possessives
            r"\bhis\b", r"\bher\b", r"\btheir\b",
            # Specific relationships
            r"the student", r"my student", r"the teacher", r"my friend", r"my partner", r"my husband",
            r"my wife", r"my child", r"my son", r"my daughter", r"the patient", r"my client",
            # Question about someone else
            r"asked by his", r"asked by her", r"asked by the",
        ]

        # Context clues that suggest 3rd person
        for pattern in third_person_patterns:
            if re.search(pattern, question):
                return {
                    "is_third_person": True,
                    "subject_house": 7,  # The other person = 7th house
                    "turn_houses": True,
                    "pattern_matched": pattern.strip(),
                }
        
        # Educational context: teacher asking about student
        if any(x in question for x in ["asked by his teacher", "asked by her teacher", "asked by the teacher"]):
            return {
                "is_third_person": True,
                "subject_house": 7,  # Student = 7th house from teacher's perspective
                "turn_houses": True,
                "pattern_matched": "teacher asking about student",
                "educational_context": True
            }
        
        return {"is_third_person": False}

    def _get_derived_house_for_possessions(self, person_house: int) -> int:
        """Get 2nd house from person's house (their possessions/money)"""
        return self._apply_house_derivation(person_house, 2)
    
    def _analyze_possession_questions(self, question_lower: str) -> Dict:
        """Enhanced logic for possession/property questions with proper house derivation"""
        
        # CRITICAL FIX: Distinguish between SALE TRANSACTIONS and POSSESSION questions
        
        # SALE/TRANSACTION questions (will X sell Y?) use natural significators
        sale_indicators = ["sell", "buy", "sale", "purchase", "trade"]
        if any(word in question_lower for word in sale_indicators):
            # Detect valuable items using traditional natural significators
            natural_significator = self._detect_natural_significator(question_lower)

            if natural_significator:
                return {
                    "type": Category.MONEY,
                    "houses": [1, 7],
                    "natural_significators": natural_significator,
                    "transaction_context": True,
                }
            else:
                # General sale: seller + buyer
                return {"type": Category.MONEY, "houses": [1, 7]}
        
        # POSSESSION questions (does X own Y?) use house derivation
        possession_indicators = ["property", "money", "possessions", "belongings", "assets"]
        if any(word in question_lower for word in possession_indicators):
            # Determine whose possessions - check for other people first, then default to querent
            if re.search(r"\b(his|her|husband|wife|spouse)\b", question_lower):
                # Partner's possessions = 8th house (2nd from 7th)
                return {"type": Category.MONEY, "houses": [1, 7, 8]}  # Querent + partner + partner's possessions
            elif re.search(r"\b(father|dad)\b", question_lower):
                # Father's possessions = 5th house (2nd from 4th)
                return {"type": Category.MONEY, "houses": [1, 4, 5]}
            elif re.search(r"\b(mother|mom)\b", question_lower):
                # Mother's possessions = 11th house (2nd from 10th)
                return {"type": Category.MONEY, "houses": [1, 10, 11]}
            elif re.search(r"\b(my|i|will i)\b", question_lower):
                return {"type": Category.MONEY, "houses": [1, 2]}  # Querent's possessions
            else:
                # Default: assume querent's possessions if no person specified
                return {"type": Category.MONEY, "houses": [1, 2]}
        
        return None
    
    def _detect_natural_significator(self, question_lower: str) -> Dict:
        """Detect natural significators based on traditional horary assignments"""
        
        # Traditional Natural Significators (from Lilly, Bonatti, etc.)
        natural_significators = {
            # Vehicles & Transportation
            "vehicles": {
                "keywords": ["car", "vehicle", "automobile", "truck", "motorcycle", "bike"],
                "significator": "sun",  # Sun = valuable possessions, status symbols
                "category": Category.VEHICLE,
            },

            # Real Estate
            "real_estate": {
                "keywords": ["house", "home", "property", "building", "land", "estate"],
                "significator": "moon",  # Moon = home, real estate (4th house connection)
                "category": Category.PROPERTY,
            },

            # Precious Items
            "precious_items": {
                "keywords": ["jewelry", "gold", "silver", "diamond", "ring", "watch", "precious"],
                "significator": "venus",  # Venus = luxury items, beauty, value
                "category": Category.PRECIOUS,
            },

            # Technology
            "technology": {
                "keywords": ["computer", "phone", "laptop", "electronics", "device", "gadget"],
                "significator": "mercury",  # Mercury = communication, technology
                "category": Category.TECHNOLOGY,
            },

            # Livestock & Animals
            "livestock": {
                "keywords": ["horse", "cattle", "cow", "livestock", "animal"],
                "significator": "mars",  # Mars = large animals (traditional)
                "category": Category.LIVESTOCK,
            },

            # Boats & Ships
            "maritime": {
                "keywords": ["boat", "ship", "yacht", "vessel"],
                "significator": "moon",  # Moon = water-related items
                "category": Category.MARITIME,
            },
        }
        
        # Detect which category matches
        for category, info in natural_significators.items():
            if any(keyword in question_lower for keyword in info["keywords"]):
                item_name = next(keyword for keyword in info["keywords"] if keyword in question_lower)
                return {
                    item_name: info["significator"],
                    "category": info["category"],
                    "traditional_source": "Based on classical horary significator assignments"
                }
        
        return None
    
    def _determine_question_type(self, question: str) -> tuple[Category, List[str]]:
        """Enhanced question type determination with transaction and possession priority"""
        
        # PRIORITY 1: Financial transactions override relationship keywords
        transaction_words = ["sell", "buy", "purchase", "sale", "profit", "gain", "lose", "cost", "price", "payment", "trade", "exchange", "loan"]
        if any(word in question for word in transaction_words):
            return Category.MONEY, [word for word in transaction_words if word in question]
        
        # PRIORITY 2: Possession/property questions override person keywords  
        possession_words = ["car", "house", "vehicle", "property", "possessions", "belongings", "assets", "furniture", "jewelry", "valuables"]
        if any(word in question for word in possession_words):
            return Category.MONEY, [word for word in possession_words if word in question]
        
        # ENHANCED: Priority-based matching to handle overlapping keywords
        # Some words like "paralegal" contain "legal" but should match "education" not "lawsuit"
        
        matches = []
        for q_type, keywords in self.question_patterns.items():
            # FIXED: Better word boundary matching to avoid false positives like "ex" in "exam"
            matched_keywords = []
            for keyword in keywords:
                # Use word boundary checks for short words that can cause false positives
                if len(keyword) <= 3:
                    # For short words, require word boundaries or specific context
                    import re
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, question, re.IGNORECASE):
                        matched_keywords.append(keyword)
                else:
                    # For longer words, simple substring matching is usually fine
                    if keyword in question:
                        matched_keywords.append(keyword)
            
            if matched_keywords:
                matches.append((q_type, matched_keywords))
        
        if not matches:
            return Category.GENERAL, []

        # If only one match, return it
        if len(matches) == 1:
            return matches[0][0], matches[0][1]
            
        # ENHANCED: Handle multiple matches with priority logic
        # Priority 1: Education keywords take precedence over legal when both match
        education_match = None
        lawsuit_match = None

        for q_type, matched_keywords in matches:
            if q_type == Category.EDUCATION:
                education_match = (q_type, matched_keywords)
            elif q_type == Category.LAWSUIT:
                lawsuit_match = (q_type, matched_keywords)
        
        # If both education and lawsuit match, prefer education for exam/student contexts
        if education_match and lawsuit_match:
            # Check for strong education indicators
            education_indicators = ["exam", "test", "student", "school", "college", "university", "pass", "graduate"]
            if any(indicator in question for indicator in education_indicators):
                return Category.EDUCATION, education_match[1]
            # Check for strong legal indicators  
            legal_indicators = ["court", "lawsuit", "judge", "trial", "litigation", "case"]
            if any(indicator in question for indicator in legal_indicators):
                return Category.LAWSUIT, lawsuit_match[1]

        # Default: return the first match (maintains original behavior for other cases)
        return matches[0][0], matches[0][1]
    
    def _determine_houses(self, question: str, question_type: Category, third_person_analysis: Dict = None) -> tuple:
        """ENHANCED: Determine houses using comprehensive traditional horary rules"""
        
        # Start with querent (always 1st house)
        houses = [1]
        
        # PRIORITY: Check for possession questions first with proper house derivation
        possession_analysis = self._analyze_possession_questions(question.lower())
        if possession_analysis:
            return possession_analysis["houses"], possession_analysis
        
        # ENHANCED: Comprehensive house determination
        if question_type == Category.LOST_OBJECT:
            houses.append(2)  # Moveable possessions

        elif question_type == Category.MARRIAGE or "spouse" in question:
            houses.append(7)  # Marriage/spouse

        elif question_type == Category.RELATIONSHIP:
            # ENHANCED: Relationship questions use L1/L7 axis (self vs others)
            houses.append(7)  # L1 = self, L7 = other person/partner

        elif question_type == Category.PREGNANCY:
            if third_person_analysis and third_person_analysis.get("is_third_person"):
                subject_house = third_person_analysis["subject_house"]
                pregnancy_house = self._apply_house_derivation(subject_house, 5)
                houses.extend([subject_house, pregnancy_house])
            else:
                houses.append(5)  # Pregnancy and children

        elif question_type == Category.CHILDREN:
            houses.append(5)  # Children

        elif question_type == Category.GAMBLING:
            houses.append(5)  # Gambling, speculation, lottery - 5th house pleasure/risk

        elif question_type == Category.TRAVEL:
            # Enhanced long-distance travel detection
            long_distance_keywords = [
                "far", "foreign", "abroad", "overseas", "international", 
                "long-distance", "long distance", "long-term", "extended",
                "distant", "vacation", "holiday", "cruise", "pilgrimage"
            ]
            if any(word in question for word in long_distance_keywords):
                houses.append(9)  # Long journeys/foreign travel  
            else:
                houses.append(3)  # Short journeys/local travel
            
            # ENHANCED: Also consider 6th house for health issues during travel
            # Traditional horary often looks at 6th house for travel illness
            houses.append(6)  # Health/illness during travel
                
        elif question_type == Category.FUNDING:
            # ENHANCED: Funding questions use L2/L8 axis (self resources vs others' money)
            if any(word in question for word in ["secure", "get", "receive", "obtain", "raise", "from investors", "investor", "vc", "angel"]):
                houses.extend([1, 8])  # L1 = querent, L8 = funding from others/investors
            elif any(word in question for word in ["my funding", "our funding", "have enough", "sufficient capital"]):
                houses.extend([1, 2])  # L1 = querent, L2 = self resources
            else:
                houses.extend([2, 8])  # Default: both self resources and others' money
            
        elif question_type == Category.MONEY:
            if any(word in question for word in ["debt", "loan", "owe", "borrow"]):
                houses.append(8)  # Debts and others' money
            else:
                houses.append(2)  # Personal money/possessions
                
        elif question_type == Category.CAREER:
            houses.append(10)  # Career/reputation/profession
            
        elif question_type == Category.HEALTH:
            # ENHANCED: Health questions use L1/L6 axis (self vs illness)
            houses.extend([1, 6])  # L1 = self/vitality, L6 = illness/disease
                
        elif question_type == Category.LAWSUIT:
            houses.append(7)  # Open enemies/legal opponents
            
        # NEW: Education questions with 3rd person logic - CRITICAL FIX
        elif question_type == Category.EDUCATION:
            if third_person_analysis and third_person_analysis.get("is_third_person"):
                # Question about someone else's education (e.g., "Will he pass the exam?")
                student_house = third_person_analysis["subject_house"]  # 7th house for the student
                
                # Student's preparation/knowledge = 3rd from student = radical 9th
                # (3rd house rules basic learning, study habits, preparation)
                prep_house = self._apply_house_derivation(student_house, 3)  # 9th house
                
                # Success in exams = 10th house (honors/achievement)
                success_house = 10
                
                houses = [1, student_house, prep_house, success_house]  # Querent, student, prep, success
                
            elif re.search(r"\b(my|i|will i)\b", question):
                houses.extend([10, 9])  # L10 = success/result first, then L9 = exam/knowledge
            else:
                houses.extend([10, 9])  # Default: L10 success primary, L9 knowledge secondary
                
        # NEW: Person-specific house assignments
        elif question_type == Category.PARENT:
            if any(word in question for word in ["father", "dad"]):
                houses.append(4)  # 4th house = father
            elif any(word in question for word in ["mother", "mom"]):
                houses.append(10)  # 10th house = mother
            else:
                houses.append(4)  # Default to father
                
        elif question_type == Category.SIBLING:
            houses.append(3)  # 3rd house = siblings
            
        elif question_type == Category.FRIEND_ENEMY:
            if any(word in question for word in ["friend", "ally"]):
                houses.append(11)  # 11th house = friends
            else:
                houses.append(7)   # 7th house = open enemies
                
        # NEW: Property questions
        elif question_type == Category.PROPERTY:
            houses.append(4)  # 4th house = real estate, land, property
            
        # NEW: Death and inheritance
        elif question_type == Category.DEATH:
            houses.append(8)  # 8th house = death, wills, inheritance
            
        # NEW: Spiritual questions
        elif question_type == Category.SPIRITUAL:
            houses.append(9)  # 9th house = religion, spirituality, higher wisdom
            
        else:
            # Enhanced default logic - analyze question context
            if re.search(r"\b(other|they|he|she|person|someone)\b", question):
                houses.append(7)  # 7th house for other people
            else:
                houses.append(7)  # Default fallback

        # Look for specific house keywords (but not for general questions to avoid confusion)
        if question_type != Category.GENERAL:
            for house, keywords in self.house_meanings.items():
                if house not in houses and any(keyword in question for keyword in keywords):
                    houses.append(house)

        if question_type == Category.GENERAL:
            houses = [1, 7]

        return houses, None
    
    def _determine_significators(self, houses: List[int], question_type: Category, possession_analysis: Dict = None, third_person_analysis: Dict = None) -> Dict[str, Any]:
        """Determine traditional significators with enhanced multi-house support"""
        
        # CRITICAL FIX: Handle natural significators for transaction questions
        if possession_analysis and "natural_significators" in possession_analysis:
            # For transaction questions (e.g., car sales), use natural significators
            natural_sigs = possession_analysis["natural_significators"]
            
            significators = {
                "querent_house": 1,  # Seller/querent
                "quesited_house": 7,  # Buyer/other party  
                "moon_role": "co-significator of querent and general flow",
                "special_significators": natural_sigs,  # Natural significators (e.g., Sun for car)
                "transaction_type": True  # Flag for transaction analysis
            }
        else:
            # ENHANCED: Handle 3rd person questions with multiple significators
            if third_person_analysis and third_person_analysis.get("is_third_person") and question_type == Category.EDUCATION:
                # Special case for education about someone else (e.g., "Will he pass the exam?")
                significators = {
                    "querent_house": 1,  # Teacher (querent)
                    "student_house": houses[1] if len(houses) > 1 else 7,  # Student (7th house)
                    "preparation_house": houses[2] if len(houses) > 2 else 9,  # Student's prep (9th house)
                    "success_house": houses[3] if len(houses) > 3 else 10,  # Success (10th house)
                    "quesited_house": houses[3] if len(houses) > 3 else 10,  # Primary question = success
                    "moon_role": "translation of light between significators",
                    "special_significators": {},
                    "transaction_type": False,
                    "third_person_education": True
                }
            elif third_person_analysis and third_person_analysis.get("is_third_person") and question_type == Category.PREGNANCY:
                subject_house = houses[1] if len(houses) > 1 else third_person_analysis.get("subject_house", 7)
                pregnancy_house = houses[2] if len(houses) > 2 else self._apply_house_derivation(subject_house, 5)
                significators = {
                    "querent_house": 1,
                    "subject_house": subject_house,
                    "pregnancy_house": pregnancy_house,
                    "quesited_house": pregnancy_house,
                    "moon_role": "co-significator of querent and general flow",
                    "special_significators": {},
                    "transaction_type": False,
                    "third_person_pregnancy": True
                }
            else:
                # FIXED: For general questions, use 7th house. For derived house questions, use the actual target.
                if question_type == Category.GENERAL:
                    target_house = 7  # Traditional "other person" for general questions
                elif question_type == Category.EDUCATION:
                    target_house = 10  # L10 = success/honors for exams
                elif question_type in [Category.RELATIONSHIP, Category.MARRIAGE] and 7 in houses:
                    target_house = 7  # Relationship questions should use 7th house, not 8th
                else:
                    # For derived house questions (e.g., [1, 7, 8] for husband's possessions)
                    target_house = houses[-1] if len(houses) > 1 else 7
                
                significators = {
                    "querent_house": 1,  # Always 1st house
                    "quesited_house": target_house,  # Use the final derived house
                    "moon_role": "co-significator of querent and general flow",
                    "special_significators": {},
                    "transaction_type": False
                }
        
        # Add natural significators based on question type
        if question_type == Category.MARRIAGE:
            significators["special_significators"]["venus"] = "natural significator of love"
            significators["special_significators"]["mars"] = "natural significator of men"
        elif question_type == Category.GAMBLING:
            significators["special_significators"]["jupiter"] = "natural significator of fortune and luck"
            significators["special_significators"]["venus"] = "natural significator of pleasure and enjoyment"
        elif question_type == Category.FUNDING:
            significators["special_significators"]["jupiter"] = "natural significator of abundance and investors"
            significators["special_significators"]["venus"] = "natural significator of attraction and partnerships"
            significators["special_significators"]["mercury"] = "natural significator of contracts and negotiations"
        elif question_type == Category.MONEY:
            significators["special_significators"]["jupiter"] = "greater fortune"
            significators["special_significators"]["venus"] = "lesser fortune"
        elif question_type == Category.CAREER:
            significators["special_significators"]["sun"] = "honor and reputation"
            significators["special_significators"]["jupiter"] = "success"
        elif question_type == Category.HEALTH:
            significators["special_significators"]["mars"] = "fever and inflammation"
            significators["special_significators"]["saturn"] = "chronic illness"
        # NEW: Education significators
        elif question_type == Category.EDUCATION:
            significators["special_significators"]["mercury"] = "natural significator of learning and knowledge"
            significators["special_significators"]["jupiter"] = "wisdom and higher learning"
        # NEW: Travel significators
        elif question_type == Category.TRAVEL:
            significators["special_significators"]["mercury"] = "short journeys"
            significators["special_significators"]["jupiter"] = "long journeys and foreign travel"
        
        return significators


