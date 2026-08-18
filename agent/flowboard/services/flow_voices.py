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
    sample_text_en: str
    preview_url: str | None


GOOGLE_FLOW_VOICES: list[FlowVoiceProfile] = [
    # ── Nữ (Female Voices) ──
    {
        "id": "aoede",
        "name": "Aoede",
        "gender": "female",
        "vibe": "Warm & Expressive",
        "description": "Giọng nữ ấm áp, truyền cảm, diễn xuất tự nhiên — Thích hợp cho TVC, Storytelling, Lồng tiếng chính diện",
        "sample_text": "Chào bạn, hãy cùng bắt đầu câu chuyện ngày hôm nay.",
        "sample_text_en": "Hello, I am Aoede. I provide warm, expressive narration for your characters.",
        "preview_url": None,
    },
    {
        "id": "kore",
        "name": "Kore",
        "gender": "female",
        "vibe": "Gentle & Soothing",
        "description": "Giọng nữ dịu dàng, nhẹ nhàng, thư giãn — Thích hợp cho Podcast, Chăm sóc sức khỏe, Spa/Lifestyle",
        "sample_text": "Thả lỏng cơ thể và tận hưởng khoảnh khắc yên bình này.",
        "sample_text_en": "Take a deep breath and enjoy this peaceful, gentle moment.",
        "preview_url": None,
    },
    {
        "id": "leda",
        "name": "Leda",
        "gender": "female",
        "vibe": "Confident & Professional",
        "description": "Giọng nữ tự tin, sắc sảo, đĩnh đạc — Thích hợp cho Doanh nghiệp, Tin tức, Thời trang cao cấp, Diễn giả",
        "sample_text": "Giải pháp đột phá mang lại hiệu suất vượt trội cho bạn.",
        "sample_text_en": "Delivering breakthrough solutions and exceptional professional performance.",
        "preview_url": None,
    },
    {
        "id": "zephyr",
        "name": "Zephyr",
        "gender": "female",
        "vibe": "Bright & Youthful",
        "description": "Giọng nữ tươi sáng, trẻ trung, năng động — Thích hợp cho Vlog, Review sản phẩm, TikTok/Shorts, GenZ",
        "sample_text": "Hôm nay mình sẽ bật mí cho các bạn một điều siêu thú vị nhé!",
        "sample_text_en": "Hey there! Today I'm going to share something super exciting with you!",
        "preview_url": None,
    },
    {
        "id": "autonoe",
        "name": "Autonoe",
        "gender": "female",
        "vibe": "Soft & Melodic",
        "description": "Giọng nữ trong trẻo, nhẹ nhàng, du dương — Thích hợp cho Hoạt hình, Kể chuyện thiếu nhi, ASMR",
        "sample_text": "Những ngôi sao lấp lánh đang thì thầm câu chuyện cổ tích kỳ diệu.",
        "sample_text_en": "Listen closely to the gentle melody of the evening breeze.",
        "preview_url": None,
    },
    {
        "id": "callisto",
        "name": "Callisto",
        "gender": "female",
        "vibe": "Rich & Elegant",
        "description": "Giọng nữ quý phái, thanh lịch, sang trọng — Thích hợp cho Thương hiệu Luxury, Mỹ phẩm, Phim tài liệu nghệ thuật",
        "sample_text": "Vẻ đẹp vượt thời gian được kiến tạo từ sự tinh tế và hoàn mỹ.",
        "sample_text_en": "Timeless elegance crafted with undeniable grace and sophistication.",
        "preview_url": None,
    },
    {
        "id": "despina",
        "name": "Despina",
        "gender": "female",
        "vibe": "Energetic & Spirited",
        "description": "Giọng nữ hoạt bát, cuốn hút, tràn đầy năng lượng — Thích hợp cho Thể thao, Du lịch, Sự kiện, Gameshow",
        "sample_text": "Sẵn sàng bùng nổ cùng những trải nghiệm tuyệt vời nhất nào!",
        "sample_text_en": "Get ready for an exciting journey packed with pure energy!",
        "preview_url": None,
    },
    {
        "id": "europa",
        "name": "Europa",
        "gender": "female",
        "vibe": "Poised & Dynamic",
        "description": "Giọng nữ hiện đại, rõ ràng, dứt khoát — Thích hợp cho Video công nghệ, Startup, Hướng dẫn sản phẩm",
        "sample_text": "Khám phá tương lai với các tính năng thông minh vượt bậc.",
        "sample_text_en": "Empowering your next breakthrough with modern intelligent tools.",
        "preview_url": None,
    },
    {
        "id": "kalyke",
        "name": "Kalyke",
        "gender": "female",
        "vibe": "Friendly & Breezy",
        "description": "Giọng nữ thân thiện, gần gũi, ấm áp — Thích hợp cho Chăm sóc khách hàng, Trợ lý ảo, Giáo dục",
        "sample_text": "Mình luôn ở đây để đồng hành và hỗ trợ bạn bất cứ lúc nào.",
        "sample_text_en": "I'm always right here to guide and support you every step of the way.",
        "preview_url": None,
    },
    {
        "id": "larissa",
        "name": "Larissa",
        "gender": "female",
        "vibe": "Clear & Articulate",
        "description": "Giọng nữ chuẩn mực, phát âm rõ ràng — Thích hợp cho E-learning, Sách nói, Phổ biến kiến thức",
        "sample_text": "Kiến thức là chìa khóa mở ra những cánh cửa thành công mới.",
        "sample_text_en": "Clear communication and articulate storytelling for every topic.",
        "preview_url": None,
    },
    {
        "id": "metis",
        "name": "Metis",
        "gender": "female",
        "vibe": "Wise & Grounded",
        "description": "Giọng nữ sâu lắng, thông tuệ, điềm tĩnh — Thích hợp cho Phim tài liệu lịch sử, Triết học, Thiền định",
        "sample_text": "Mỗi bài học trong quá khứ là nền tảng vững chắc cho tương lai.",
        "sample_text_en": "Deep wisdom and grounded insight guiding every decision.",
        "preview_url": None,
    },
    {
        "id": "pandora",
        "name": "Pandora",
        "gender": "female",
        "vibe": "Playful & Imaginative",
        "description": "Giọng nữ dí dỏm, biến hóa, giàu cảm xúc — Thích hợp cho Game, Audio Drama, Nhân vật hoạt hình",
        "sample_text": "Điều bất ngờ gì đang chờ đợi bạn phía sau cánh cửa bí mật này?",
        "sample_text_en": "What exciting wonders await inside this magical box of mystery?",
        "preview_url": None,
    },
    {
        "id": "thebe",
        "name": "Thebe",
        "gender": "female",
        "vibe": "Gentle & Lyrical",
        "description": "Giọng nữ êm ái, thơ mộng — Thích hợp cho Thơ ca, Giới thiệu âm nhạc, Video phong cảnh",
        "sample_text": "Lắng nghe thanh âm dịu dàng của tự nhiên giữa trời mây yên ả.",
        "sample_text_en": "A poetic, soothing presence that captures the imagination.",
        "preview_url": None,
    },

    # ── Nam (Male Voices) ──
    {
        "id": "puck",
        "name": "Puck",
        "gender": "male",
        "vibe": "Playful & Energetic",
        "description": "Giọng nam năng động, vui tươi, lôi cuốn — Thích hợp cho Quảng cáo, Hoạt hình, Content hài hước",
        "sample_text": "Tuyệt vời chưa nào, cùng khám phá ngay thôi!",
        "sample_text_en": "Awesome, right? Let's jump right into the adventure!",
        "preview_url": None,
    },
    {
        "id": "charon",
        "name": "Charon",
        "gender": "male",
        "vibe": "Deep & Resonant",
        "description": "Giọng nam trầm ấm, uy quyền, điện ảnh — Thích hợp cho Trailer phim, Game, Thương hiệu cao cấp",
        "sample_text": "Bí mật nằm sâu trong bóng tối cuối cùng đã được hé lộ.",
        "sample_text_en": "The deepest secret hidden in the shadows has finally been revealed.",
        "preview_url": None,
    },
    {
        "id": "fenrir",
        "name": "Fenrir",
        "gender": "male",
        "vibe": "Calm & Authoritative",
        "description": "Giọng nam điềm tĩnh, chín chắn, đáng tin cậy — Thích hợp cho Giới thiệu công nghệ, Báo cáo, Đọc sách",
        "sample_text": "Hệ thống đã sẵn sàng và vận hành với độ chính xác cao.",
        "sample_text_en": "The system is fully operational and performing with reliable precision.",
        "preview_url": None,
    },
    {
        "id": "orpheus",
        "name": "Orpheus",
        "gender": "male",
        "vibe": "Narrative & Dramatic",
        "description": "Giọng nam giàu cảm xúc, dẫn truyện kịch tính — Thích hợp cho Phim ngắn, Kịch bản kịch bản điện ảnh",
        "sample_text": "Mỗi bước đi đều để lại một dấu ấn không thể phai mờ.",
        "sample_text_en": "Every single step leaves a lasting, unforgettable impression in time.",
        "preview_url": None,
    },
    {
        "id": "achernar",
        "name": "Achernar",
        "gender": "male",
        "vibe": "Crisp & Modern",
        "description": "Giọng nam hiện đại, rõ ràng, dứt khoát — Thích hợp cho Tin tức, Video giới thiệu ứng dụng, Tài chính",
        "sample_text": "Cập nhật những xu hướng công nghệ nổi bật nhất trong ngày.",
        "sample_text_en": "Delivering crisp, modern narration with focused clarity.",
        "preview_url": None,
    },
    {
        "id": "algenib",
        "name": "Algenib",
        "gender": "male",
        "vibe": "Engaging & Confident",
        "description": "Giọng nam tự tin, lôi cuốn người nghe — Thích hợp cho Bán hàng, Thuyết trình, Pitching",
        "sample_text": "Đây chính là giải pháp tối ưu mà doanh nghiệp bạn đang tìm kiếm.",
        "sample_text_en": "Engaging, confident delivery tailored for impactful presentations.",
        "preview_url": None,
    },
    {
        "id": "algol",
        "name": "Algol",
        "gender": "male",
        "vibe": "Robust & Deep",
        "description": "Giọng nam dày dặn, mạnh mẽ, nam tính — Thích hợp cho Phim hành động, Thể thao mạo hiểm, Ô tô/Cơ khí",
        "sample_text": "Sức mạnh và độ bền vượt trội trên mọi cung đường thách thức.",
        "sample_text_en": "Robust, deep resonance engineered for strength and power.",
        "preview_url": None,
    },
    {
        "id": "alnilam",
        "name": "Alnilam",
        "gender": "male",
        "vibe": "Polished & Broadcast",
        "description": "Giọng nam chuẩn phát thanh viên, chuyên nghiệp — Thích hợp cho Bản tin truyền hình, Báo cáo thường niên",
        "sample_text": "Kính chào quý vị và các bạn đến với bản tin thời sự hôm nay.",
        "sample_text_en": "A polished broadcast voice trusted for journalism and formal media.",
        "preview_url": None,
    },
    {
        "id": "ganymede",
        "name": "Ganymede",
        "gender": "male",
        "vibe": "Warm & Natural",
        "description": "Giọng nam ấm áp, mộc mạc, gần gũi — Thích hợp cho Phim tài liệu đời sống, Ẩm thực, Du lịch bụi",
        "sample_text": "Cùng ngồi xuống và thưởng thức hương vị giản dị của cuộc sống.",
        "sample_text_en": "A warm, natural voice that connects effortlessly with your audience.",
        "preview_url": None,
    },
    {
        "id": "io",
        "name": "Io",
        "gender": "male",
        "vibe": "Youthful & Enthusiastic",
        "description": "Giọng nam trẻ tuổi, nhiệt huyết, sôi nổi — Thích hợp cho Review công nghệ, Gaming, Shorts/Reels",
        "sample_text": "Chào mừng các bạn đã quay trở lại với video trải nghiệm cực chất hôm nay!",
        "sample_text_en": "High-energy, youthful spirit ready to hype up any scene!",
        "preview_url": None,
    },
    {
        "id": "titan",
        "name": "Titan",
        "gender": "male",
        "vibe": "Powerful & Commanding",
        "description": "Giọng nam quyền lực, vang dội, sấm sét — Thích hợp cho Nhân vật thủ lĩnh, Chiến binh, Game RPG, Boss",
        "sample_text": "Trước sức mạnh của ta, mọi thử thách đều phải cúi đầu!",
        "sample_text_en": "An epic, commanding voice built for legendary heroes and epic tales.",
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
