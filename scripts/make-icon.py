from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
size = 256
image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((5, 5, 251, 251), radius=48, fill='#183A30')
font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 175)
draw.text((43, 18), 'П', font=font, fill='#FFFFFF')
draw.ellipse((190, 178, 225, 213), fill='#D9B86A')
(root / 'assets').mkdir(exist_ok=True)
image.save(root / 'assets' / 'app.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
