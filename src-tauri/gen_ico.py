from PIL import Image
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
icon_path = 'icons/icon.png'
ico_path = 'icons/icon.ico'

img = Image.open(icon_path)
img.save(ico_path, sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(256,256)])
print('icon.ico generated successfully')
