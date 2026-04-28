import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 기존 모듈 활용
from recipes.utils.config import OPENAI_API_KEY
from recipes.rag.search_engine import (
    search_naver_blogs, 
    fetch_blog_body, 
    clean_html, 
    resolve_blog_url
)

# 레시피 요약을 위한 프롬프트 (기존 포맷 유지)
SEASONAL_RECIPE_PROMPT = """
당신은 제철 식재료의 풍미를 가장 잘 살리는 요리사입니다. 
아래의 블로그 본문을 읽고, 제철 재료인 '{food}'를 활용한 맛있는 레시피 노트를 작성해 주세요.

[블로그 본문]
{body}

작성 규칙:
1. 오직 제공된 본문 내용을 바탕으로 **[필요한 재료]**와 **[조리 순서]**만 요약해 주세요.
2. 친절하고 부드러운 말투(~해요, ~하세요)를 사용해 주세요.
3. 너무 길지 않게 핵심 조리 과정만 요약해 주세요.
"""

class SeasonalRecipeCurator:
    def __init__(self):
        self.llm = ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o-mini",
            temperature=0
        )
        self.parser = StrOutputParser()
        self.data_path = os.path.join(os.path.dirname(__file__), "seasonal_data.json")
        self._data = None

    def _load_data(self):
        """JSON 데이터를 로드합니다."""
        if self._data is None:
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except Exception as e:
                print(f"❌ 데이터 로드 실패: {e}")
                self._data = {}
        return self._data

    def get_ingredients_by_month(self, month_text: str) -> list:
        """입력 텍스트에서 숫자를 추출하여 해당 월의 제철 음식 리스트를 반환합니다."""
        # "4월", "4", "4월달" 등에서 숫자만 추출
        match = re.search(r"(\d+)", month_text)
        if not match:
            return []
        
        month = match.group(1)
        data = self._load_data()
        return data.get(month, [])

    def get_recipe_by_seasonal_food(self, food_name: str) -> dict:
        """선택된 제철 재료에 대한 레시피를 검색하고 요약합니다."""
        print(f"🔍 [Seasonal Curator] '{food_name}' 레시피 검색 중...")
        
        # 1. 네이버 블로그 검색
        search_query = f"{food_name} 요리 레시피"
        items = search_naver_blogs(search_query, display=3, sort_type="sim")
        
        if not items:
            return {
                "answer": f"죄송합니다. 현재 '{food_name}'와(과) 관련된 레시피 정보를 찾을 수 없습니다.",
                "source": "web",
                "candidates": []
            }

        # 2. 가장 적합한 블로그 본문 크롤링
        best_item = items[0]
        body_text = fetch_blog_body(best_item['link'], max_chars=1500)

        # 3. LLM 요약
        if body_text and len(body_text) > 200:
            chain = ChatPromptTemplate.from_template(SEASONAL_RECIPE_PROMPT) | self.llm | self.parser
            recipe_summary = chain.invoke({"food": food_name, "body": body_text})
        else:
            recipe_summary = "블로그 본문 내용을 가져오지 못해 상세 요약이 어렵습니다. 아래 링크를 참고해 주세요! 😊"

        final_answer = (
            f"📅 **지금이 제철! '{food_name}'(으)로 만드는 추천 요리입니다.**\n\n"
            f"{recipe_summary}\n\n"
            f"---\n"
            f"더 자세한 사진과 설명은 아래 블로그 링크에서 확인하실 수 있어요! 👇"
        )

        candidates = [{
            "title": f"[제철 레시피] {clean_html(best_item['title'])}",
            "url": resolve_blog_url(best_item['link']),
            "ingredients_summary": f"'{food_name}' 제철 식재료 요리 정보",
            "source": "web"
        }]

        return {"answer": final_answer, "source": "web", "candidates": candidates}

# ==========================================
# 독립 테스트 코드 (터미널 실행용)
# ==========================================
if __name__ == "__main__":
    curator = SeasonalRecipeCurator()
    
    # 테스트 1: 월별 리스트 가져오기
    test_month = "4월"
    foods = curator.get_ingredients_by_month(test_month)
    print(f"\n--- [{test_month} 제철 음식] ---")
    print(", ".join(foods) if foods else "데이터 없음")
    
    # 테스트 2: 재료 레시피 검색
    if foods:
        test_food = foods[0] # 달래
        result = curator.get_recipe_by_seasonal_food(test_food)
        print(f"\n--- ['{test_food}' 레시피 결과] ---")
        print(result['answer'])
        print(f"\n링크: {result['candidates'][0]['url']}")
