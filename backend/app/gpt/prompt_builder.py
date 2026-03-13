from app.gpt.prompt import BASE_PROMPT

note_formats = [
    {'label': '目錄', 'value': 'toc'},
    {'label': '原片跳轉', 'value': 'link'},
    {'label': '原片截圖', 'value': 'screenshot'},
    {'label': 'AI總結', 'value': 'summary'}
]

note_styles = [
    {'label': '精簡', 'value': 'minimal'},
    {'label': '詳細', 'value': 'detailed'},
    {'label': '學術', 'value': 'academic'},
    {"label": '教程',"value": 'tutorial', },
    {'label': '小紅書', 'value': 'xiaohongshu'},
    {'label': '生活向', 'value': 'life_journal'},
    {'label': '任務導向', 'value': 'task_oriented'},
    {'label': '商業風格', 'value': 'business'},
    {'label': '會議紀要', 'value': 'meeting_minutes'}
]


# 生成 BASE_PROMPT 函数
def generate_base_prompt(title, segment_text, tags, _format=None, style=None, extras=None):
    # 生成 Base Prompt 开头部分
    prompt = BASE_PROMPT.format(
        video_title=title,
        segment_text=segment_text,
        tags=tags
    )

    # 添加用户选择的格式
    if _format:
        prompt += "\n" + "\n".join([get_format_function(f) for f in _format])

    # 根据用户选择的笔记风格添加描述
    if style:
        prompt += "\n" + get_style_format(style)

    # 添加额外内容
    if extras:
        prompt += f"\n{extras}"
    return prompt


# 获取格式函数
def get_format_function(format_type):
    format_map = {
        'toc': get_toc_format,
        'link': get_link_format,
        'screenshot': get_screenshot_format,
        'summary': get_summary_format
    }
    return format_map.get(format_type, lambda: '')()


# 風格描述的處理
def get_style_format(style):
    style_map = {
        'minimal': '1. **精簡信息**: 僅記錄最重要的內容，簡潔明了。',
        'detailed': '2. **詳細記錄**: 包含完整的內容和每個部分的詳細討論。需要盡可能多的記錄視頻內容，最好詳細的筆記',
        'academic': '3. **學術風格**: 適合學術報告，正式且結構化。',
        'xiaohongshu': '''4. **小紅書風格**: 
### 擅長使用下面的爆款關鍵詞：
好用到哭，大數據，教科書般，小白必看，寶藏，絕絕子神器，都給我衝,劃重點，笑不活了，YYDS，秘方，我不允許，壓箱底，建議收藏，停止擺爛，上天在提醒你，挑戰全網，手把手，揭秘，普通女生，沉浸式，有手就能做吹爆，好用哭了，搞錢必看，狠狠搞錢，打工人，吐血整理，家人們，隱藏，高級感，治癒，破防了，萬萬沒想到，爆款，永遠可以相信被誇爆手殘黨必備，正確姿勢

### 採用二極管標題法創作標題：
- 正面刺激法:產品或方法+只需1秒 (短期)+便可開掛（逆天效果）
- 負面刺激法:你不XXX+絕對會後悔 (天大損失) +(緊迫感)
利用人們厭惡損失和負面偏誤的心理

### 寫作技巧
1. 使用驚嘆號、省略號等標點符號增強表達力，營造緊迫感和驚喜感。
2. **使用emoji表情符號，來增加文字的活力**
3. 采用具有挑战性和悬念的表述，引发读、“无敌者好奇心，例如“暴涨词汇量”了”、“拒绝焦虑”等
4. 利用正面刺激和负面激，诱发读者的本能需求和动物基本驱动力，如“离离原上谱”、“你不知道的项目其实很赚”等
5. 融入热点话题和实用工具，提高文章的实用性和时效性，如“2023年必知”、“chatGPT狂飙进行时”等
6. 描述具体的成果和效果，强调标题中的关键词，使其更具吸引力，例如“英语底子再差，搞清这些语法你也能拿130+”
7. 使用吸引人的標題：''',

        'life_journal': '5. **生活向**: 記錄個人生活感悟，情感化表達。',
        'task_oriented': '6. **任務導向**: 強調任務、目標，適合工作和待辦事項。',
        'business': '7. **商業風格**: 適合商業報告、會議紀要，正式且精準。',
        'meeting_minutes': '8. **會議紀要**: 適合商業報告、會議紀要，正式且精準。',
        "tutorial":"9.**教程筆記**:盡可能詳細的記錄教程,特別是關鍵點和一些重要的結論步驟"
    }
    return style_map.get(style, '')


# 格式化輸出內容
def get_toc_format():
    return '''
    9. **目錄**: 自動生成一個基於 `##` 級標題的目錄。不需要插入原片跳轉
    '''


def get_link_format():
    return '''
    10. **原片跳轉**: 為每個主要章節添加時間戳，使用格式 `*Content-[mm:ss]`。 
    重要：**始終**在章節標題前加上 `*Content` 前綴，例如：`AI 的發展史 *Content-[01:23]`。一定是標題在前 插入標記在後
    '''


def get_screenshot_format():
    return '''
11. **原片截圖**:你收到的截圖一般是一個網格，網格的每張圖片就是一個時間點，左上角會包含時間mm:ss的格式，請你結合我發你的圖片插入截圖提示，請你幫助用戶更好的理解視頻內容，請你認真的分析每個圖片和對應的轉寫文案，插入最合適的內容來備註用戶理解，請一定按照這個格式 返回否則系統無法解析：
- 格式：`*Screenshot-[mm:ss]`

    '''


def get_summary_format():
    return '''
    12. **AI總結**: 在筆記末尾加入簡短的AI生成總結,並且二級標題 就是 AI 總結 例如 ## AI 總結。
    '''
