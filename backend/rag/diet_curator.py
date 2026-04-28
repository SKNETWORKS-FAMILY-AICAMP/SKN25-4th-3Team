import random
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from backend.utils.config import OPENAI_API_KEY
from backend.rag.search_engine import search_naver_blogs, fetch_blog_body, clean_html, resolve_blog_url

# 다이어트 메뉴 선정을 위한 전용 프롬프트
DIET_SELECTION_PROMPT = """
당신은 최고의 다이어트 식단 전문가입니다. 
사용자가 '다이어트 레시피' 버튼을 눌렀습니다. 
아래는 현재 네이버 블로그에서 검색된 최신 다이어트 관련 글들의 제목 목록입니다.

[검색된 제목 목록]
{titles}

위 목록을 참고하여, 오늘 사용자에게 추천할 만한 '구체적인 다이어트 요리명' 하나를 선정해 주세요. 
반드시 요리 이름만 짧게 답변해 주세요. (예: 닭가슴살 양배추 쌈)
선정 기준:
1. 칼로리가 낮고 건강한 재료 중심
2. 누구나 따라 하기 쉬운 대중적인 요리
3. 최근 트렌드에 맞는 메뉴
"""

class DietRecipeCurator:
    def __init__(self):
        self.llm = ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model="gpt-4o-mini",
            temperature=0.7
        )
        self.parser = StrOutputParser()

    def get_automatic_diet_recipe(self) -> dict:
        """
        사용자 입력 없이 자동으로 다이어트 레시피를 큐레이션하여 반환합니다.
        """
        print("🥗 [Diet Curator] 1단계: 최신 다이어트 트렌드 탐색 시작...")
        
        # 1단계: '다이어트 레시피' 키워드로 최신 블로그 검색
        search_queries = ["다이어트 레시피 추천", "저칼로리 건강 식단", "간단한 다이어트 요리"]
        base_query = random.choice(search_queries)
        
        explore_items = search_naver_blogs(base_query, display=10, sort_type="date")
        if not explore_items:
            return {"answer": "죄송합니다. 현재 네이버에서 다이어트 정보를 가져오지 못했습니다.", "source": "web"}

        # 2단계: LLM을 통해 하나의 메뉴 확정
        titles_str = "\n".join([f"- {clean_html(item['title'])}" for item in explore_items])
        
        selection_prompt = ChatPromptTemplate.from_template(DIET_SELECTION_PROMPT)
        selection_chain = selection_prompt | self.llm | self.parser
        
        selected_dish = selection_chain.invoke({"titles": titles_str}).strip()
        print(f"💡 [Diet Curator] AI가 선정한 오늘무의 메뉴: '{selected_dish}'")

        # 3단계: 확정된 메뉴로 상세 레시피 수집 (2차 검색)
        print(f"🔍 [Diet Curator] 2단계: '{selected_dish}' 상세 검색 및 본문 수집...")
        target_items = search_naver_blogs(f"{selected_dish} 레시피", display=3, sort_type="sim")
        
        if not target_items:
            return {"answer": f"'{selected_dish}'에 대한 상세 레시피를 찾지 못했습니다.", "source": "web"}

        # 가장 적절해 보이는 블로그 하나에서 본문 추출
        best_item = target_items[0]
        body_text = fetch_blog_body(best_item['link'], max_chars=1500)
        
        if not body_text:
            # 본문 추출 실패 시 검색 결과 요약이라도 제공
            body_text = clean_html(best_item['description'])

        # 최종 응답 구성 (카드 형태 데이터 포함)
        recommendation_msg = (
            f"🥗 **오늘의 추천 다이어트 요리는 '{selected_dish}'입니다!**\n\n"
            f"칼로리는 낮추고 맛은 살린 건강한 한 끼 어떠신가요?\n"
            f"아래 블로그 레시피를 참고해 보세요. 👇"
        )

        candidates = [{
            "title": f"[추천] {clean_html(best_item['title'])}",
            "url": resolve_blog_url(best_item['link']),
            "ingredients_summary": f"'{selected_dish}' 관련 다이어트 식단 정보",
            "source": "web"
        }]

        return {
            "answer": recommendation_msg,
            "source": "web",
            "candidates": candidates
        }
