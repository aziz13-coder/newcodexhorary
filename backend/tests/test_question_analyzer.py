import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "backend"))

from question_analyzer import TraditionalHoraryQuestionAnalyzer
from taxonomy import Category


def test_loan_application_question():
    analyzer = TraditionalHoraryQuestionAnalyzer()
    question = "Will my loan application be approved?"
    question_lower = question.lower()
    q_type, _ = analyzer._determine_question_type(question_lower)
    assert q_type in {Category.FUNDING, Category.MONEY}
    houses, _ = analyzer._determine_houses(question_lower, q_type, None)
    assert houses in ([1, 8], [1, 2])


def test_masters_program_admission_question():
    analyzer = TraditionalHoraryQuestionAnalyzer()
    question = "Will I be admitted to the master's program this cycle?"
    question_lower = question.lower()
    q_type, _ = analyzer._determine_question_type(question_lower)
    assert q_type is Category.EDUCATION
    houses, _ = analyzer._determine_houses(question_lower, q_type, None)
    assert houses == [1, 10, 9]


def test_relationship_houses():
    analyzer = TraditionalHoraryQuestionAnalyzer()
    question = "Does my partner love me?"
    question_lower = question.lower()
    q_type, _ = analyzer._determine_question_type(question_lower)
    assert q_type is Category.RELATIONSHIP
    houses, _ = analyzer._determine_houses(question_lower, q_type, None)
    assert houses == [1, 7]

