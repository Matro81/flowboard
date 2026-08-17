"""Google Flow standard Voice profiles catalog.

Provides curated voice presets compatible with Google Flow, Gemini, and Veo.
"""
from __future__ import annotations

from typing import TypedDict


class FlowVoiceProfile(TypedDict):
    id: str
    name: str
    gender: str
    vibe: str
    description: str
    sample_text: str
    preview_url: str | None


GOOGLE_FLOW_VOICES: list[FlowVoiceProfile] = [
    {
        "id": "Aoede",
        "name": "Aoede",
        "gender": "female",
        "vibe": "Warm & Expressive",
        "description": "Giọng nữ ấm áp, truyền cảm, diễn cảm tự nhiên — Thích hợp cho TVC, Storytelling, Lồng tiếng",
        "sample_text": "Chào bạn, hãy cùng bắt đầu câu chuyện ngày hôm nay.",
        "preview_url": None,
    },
    {
        "id": "Kore",
        "name": "Kore",
        "gender": "female",
        "vibe": "Gentle & Soothing",
        "description": "Giọng nữ dịu dàng, nhẹ nhàng, thư giãn — Thích hợp cho Podcast, Chăm sóc sức khỏe, Spa/Lifestyle",
        "sample_text": "Thả lỏng cơ thể và tận hưởng khoảnh khắc yên bình này.",
        "preview_url": None,
    },
    {
        "id": "Leda",
        "name": "Leda",
        "gender": "female",
        "vibe": "Confident & Professional",
        "description": "Giọng nữ tự tin, chuyên nghiệp, sắc sảo — Thích hợp cho Video doanh nghiệp, Tin tức, Thời trang cao cấp",
        "sample_text": "Giải pháp đột phá mang lại hiệu suất vượt trội cho bạn.",
        "preview_url": None,
    },
    {
        "id": "Zephyr",
        "name": "Zephyr",
        "gender": "female",
        "vibe": "Bright & Youthful",
        "description": "Giọng nữ tươi sáng, trẻ trung, năng động — Thích hợp cho Vlog, Review sản phẩm, TikTok/Shorts",
        "sample_text": "Hôm nay mình sẽ bật mí cho các bạn một điều siêu thú vị nhé!",
        "preview_url": None,
    },
    {
        "id": "Puck",
        "name": "Puck",
        "gender": "male",
        "vibe": "Playful & Energetic",
        "description": "Giọng nam năng động, vui tươi, lôi cuốn — Thích hợp cho Quảng cáo, Hoạt hình, Content sáng tạo",
        "sample_text": "Tuyệt vời chưa nào, cùng khám phá ngay thôi!",
        "preview_url": None,
    },
    {
        "id": "Charon",
        "name": "Charon",
        "gender": "male",
        "vibe": "Deep & Resonant",
        "description": "Giọng nam trầm ấm, uy quyền, điện ảnh — Thích hợp cho Trailer phim, Game, Thương hiệu cao cấp",
        "sample_text": "Bí mật nằm sâu trong bóng tối cuối cùng đã được hé lộ.",
        "preview_url": None,
    },
    {
        "id": "Fenrir",
        "name": "Fenrir",
        "gender": "male",
        "vibe": "Calm & Authoritative",
        "description": "Giọng nam điềm tĩnh, chín chắn, đáng tin cậy — Thích hợp cho Giới thiệu công nghệ, Báo cáo, Đọc sách",
        "sample_text": "Hệ thống đã sẵn sàng và vận hành với độ chính xác cao.",
        "preview_url": None,
    },
    {
        "id": "Orpheus",
        "name": "Orpheus",
        "gender": "male",
        "vibe": "Narrative & Cinematic",
        "description": "Giọng nam giàu cảm xúc, dẫn truyện truyền cảm — Thích hợp cho Phim ngắn, Kịch bản kịch tính",
        "sample_text": "Mỗi bước đi đều để lại một dấu ấn không thể phai mờ.",
        "preview_url": None,
    },
]


def list_flow_voices() -> list[FlowVoiceProfile]:
    """Returns the list of supported Google Flow voice presets."""
    return list(GOOGLE_FLOW_VOICES)


def get_voice_by_id(voice_id: str) -> FlowVoiceProfile | None:
    """Find a voice profile by ID."""
    for v in GOOGLE_FLOW_VOICES:
        if v["id"].lower() == voice_id.lower():
            return v
    return None
