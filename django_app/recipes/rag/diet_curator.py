import random
import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 장고 앱 구조에 맞게 수정된 임포트 경로
from recipes.utils.config import OPENAI_API_KEY
from recipes.rag.search_engine import (
    search_naver_blogs, 
    fetch_blog_body, 
    clean_html, 
    resolve_blog_url
)

# 1. 의도 및 재료 추출을 위한 프롬프트
INTENT_ANALYSIS_PROMPT = """
사용자의 질문을 분석하여 '다이어트 레시피'를 찾는 의도인지 판단하고, 언급된 '핵심 식재료'가 있다면 추출해 주세요.
반드시 아래의 JSON 형식으로만 답변해 주세요.

질문: {question}

형식:
{{
  "is_diet_intent": true/false,
  "ingredients": "추출된 재료들 (없으면 빈 문자열)",
  "reason": "판단 이유 (간략히)"
}}
"""

# 2. 메뉴 선정을 위한 프롬프트 (검색 결과가 여러 개일 때)
DIET_SELECTION_PROMPT = """
당신은 최고의 다이어트 식단 전문가입니다. 
아래 검색 결과를 참고하여 오늘 사용자에게 추천할 만한 '구체적인 다이어트 요리명' 하나를 선정해 주세요.
반드시 요리 이름만 짧게 답변해 주세요. (예: 두부면 팟타이)

[검색 결과 목록]
{titles}
"""

# 3. 레시피 요약을 위한 프롬프트
DIET_RECIPE_SUMMARY_PROMPT = """
당신은 친절한 요리사입니다. 아래의 블로그 본문을 읽고, '{dish_name}'에 대한 레시피 노트를 작성해 주세요.

[블로그 본문]
{body}

작성 규칙:
1. 오직 제공된 본문 내용을 바탕으로 **[필요한 재료]**와 **[조리 순서]**만 요약해 주세요.
2. **칼로리나 수치 정보는 불확실할 수 있으므로 절대 언급하지 마세요.**
3. 친절하고 부드러운 말투(~해요, ~하세요)를 사용해 주세요.
4. 너무 길지 않게 핵심 조리 과정만 요약해 주세요.
"""

class DietRecipeCurator:
    def __init__(self):
        self.llm = ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o-mini",
            temperature=0
        )
        self.parser = StrOutputParser()

    def analyze_diet_intent(self, question: str) -> dict:
        """질문에서 다이어트 의도와 재료를 추출합니다."""
        chain = ChatPromptTemplate.from_template(INTENT_ANALYSIS_PROMPT) | self.llm | self.parser
        try:
            res_text = chain.invoke({"question": question})
            return json.loads(res_text)
        except:
            return {"is_diet_intent": False, "ingredients": ""}

    def get_diet_recipe(self, user_question: str = None, ingredients: str = "") -> dict:
        """사용자 질문이나 재료에 맞춰 다이어트 레시피를 큐레이션합니다."""
        
        # 1단계: 검색 쿼리 결정
        if ingredients:
            search_query = f"{ingredients} 다이어트 레시피"
            print(f"🔍 [Diet Curator] 특정 재료 기반 검색: {search_query}")
        elif user_question and user_question != "💪 다이어트 레시피":
            search_query = f"{user_question}"
            print(f"🔍 [Diet Curator] 사용자 질문 기반 검색: {search_query}")
        else:
            search_queries = ["다이어트 레시피 추천", "인기 저칼로리 식단", "간단 다이어트 요리"]
            search_query = random.choice(search_queries)
            print(f"🔍 [Diet Curator] 자동 트렌드 검색: {search_query}")

        # 2단계: 네이버 검색 수행 (엄격한 결과 확인)
        items = search_naver_blogs(search_query, display=5, sort_type="sim")
        
        if not items:
            # 환각 방지: 결과 없으면 즉시 종료
            msg = f"죄송합니다. 네이버에서 '{search_query}'와 관련된 다이어트 레시피를 찾지 못했습니다."
            if ingredients:
                msg = f"죄송합니다. 입력하신 재료({ingredients})가 포함된 다이어트 레시피 정보를 찾을 수 없습니다."
            return {"answer": msg, "source": "web", "candidates": []}

        # 3단계: 메뉴 확정 및 본문 수집
        titles_str = "\n".join([clean_html(i['title']) for i in items])
        selection_chain = ChatPromptTemplate.from_template(DIET_SELECTION_PROMPT) | self.llm | self.parser
        selected_dish = selection_chain.invoke({"titles": titles_str}).strip()
        
        # 선택된 메뉴로 가장 적합한 블로그 다시 찾기 (정밀도 향상)
        target_items = search_naver_blogs(f"{selected_dish} 레시피", display=3)
        if not target_items:
            return {"answer": f"'{selected_dish}'의 상세 레시피를 가져오는 데 실패했습니다.", "source": "web"}

        best_item = target_items[0]
        body_text = fetch_blog_body(best_item['link'], max_chars=1500)
        
        # 4단계: 레시피 요약 (환각 방지: 본문 데이터 확인)
        if body_text and len(body_text) > 200:
            summary_chain = ChatPromptTemplate.from_template(DIET_RECIPE_SUMMARY_PROMPT) | self.llm | self.parser
            recipe_summary = summary_chain.invoke({"dish_name": selected_dish, "body": body_text})
        else:
            recipe_summary = "블로그 본문 내용을 가져오지 못해 상세 요약이 어렵습니다. 아래 링크를 참고해 주세요! 😊"

        final_answer = (
            f"🥗 **오늘 추천드리는 다이어트 메뉴는 '{selected_dish}'입니다!**\n\n"
            f"{recipe_summary}\n\n"
            f"---\n"
            f"더 자세한 내용은 아래 블로그 링크를 참고해 보세요! 👇"
        )

        candidates = [{
            "title": f"[레시피] {clean_html(best_item['title'])}",
            "url": resolve_blog_url(best_item['link']),
            "ingredients_summary": f"'{selected_dish}' 관련 추천 레시피",
            "source": "web"
        }]

        return {"answer": final_answer, "source": "web", "candidates": candidates}
