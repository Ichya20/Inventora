"""Render an original, illustrative Inventora product demo; no live data or browser access.

Requires Pillow and ffmpeg (or imageio-ffmpeg). Run with --ffmpeg /path/to/ffmpeg.
Motion references and font licence are recorded in SOURCES.md and assets/OFL.txt.
"""
from __future__ import annotations
import argparse
from functools import lru_cache
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H, FPS, SECONDS = 1280, 720, 24, 26
BG, WHITE, INK, MUTED = '#eef2f6', '#ffffff', '#182230', '#627082'
BLUE, SOFT, BORDER, GREEN = '#0864d9', '#e8f0fc', '#e4e9ef', '#18794e'


@lru_cache(None)
def font(size=18, weight=400):
    face = ImageFont.truetype(str(ROOT / 'assets' / 'PlusJakartaSans.ttf'), size)
    face.set_variation_by_axes([weight])
    return face


def clamp(value):
    return min(1, max(0, value))


def ease(value):
    return 1 - (1 - clamp(value)) ** 3


def text(image, x, y, value, size=18, color=INK, weight=400, align='left'):
    draw = ImageDraw.Draw(image)
    face = font(size, weight)
    if align == 'right':
        x -= draw.textlength(value, font=face)
    elif align == 'center':
        x -= draw.textlength(value, font=face) / 2
    draw.text((round(x), round(y)), value, fill=color, font=face, anchor='lt')


def box(image, rect, fill=WHITE, outline=BORDER, radius=8):
    ImageDraw.Draw(image).rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=1)


def line(image, xy, fill=BORDER, width=1):
    ImageDraw.Draw(image).line(xy, fill=fill, width=width)


def mark(image, x, y, size, time=10):
    # Original Inventora SVG: x/y 2/14, width/height 8, rx 1.5, diagonal fills 1/.15.
    for index, (rx, ry, opacity, dx, dy) in enumerate([
        (2, 2, 1, -5, -5), (14, 2, .15, 5, -5),
        (2, 14, .15, -5, 5), (14, 14, 1, 5, 5),
    ]):
        p = ease((time - index * .075) / .48)
        scale = .78 + .22 * p
        unit = size / 24
        side = 8 * unit * scale
        tx = x + (rx + dx * (1-p)) * unit + (8 * unit - side) / 2
        ty = y + (ry + dy * (1-p)) * unit + (8 * unit - side) / 2
        tile = Image.new('RGBA', image.size)
        ImageDraw.Draw(tile).rounded_rectangle((tx, ty, tx+side, ty+side), radius=1.5*unit*scale, fill=(23, 23, 23, round(255*opacity*p)))
        image.alpha_composite(tile)


def tag(image, x, y, label, color=BLUE, fill=SOFT):
    width = ImageDraw.Draw(image).textlength(label, font=font(14, 500)) + 22
    box(image, (x, y, x+width, y+28), fill, fill, 5)
    text(image, x+11, y+6, label, 14, color, 500)


def button(image, x, y, label, width=180):
    box(image, (x, y, x+width, y+40), BLUE, BLUE, 7)
    text(image, x+width/2, y+12, label, 15, WHITE, 600, 'center')


def check(image, cx, cy, progress=1):
    box(image, (cx-22, cy-22, cx+22, cy+22), '#e8f4ee', '#e8f4ee', 22)
    points = [(cx-9, cy), (cx-2, cy+7), (cx+11, cy-8)]
    p = clamp(progress)
    if p > 0:
        if p < .35:
            q = p/.35
            end = tuple(points[0][i]+(points[1][i]-points[0][i])*q for i in (0, 1))
            line(image, [points[0], end], GREEN, 3)
        else:
            q = (p-.35)/.65
            end = tuple(points[1][i]+(points[2][i]-points[1][i])*q for i in (0, 1))
            line(image, [points[0], points[1], end], GREEN, 3)


def shell(title, selected, subtitle):
    image = Image.new('RGBA', (W, H), BG)
    mark(image, 44, 34, 27)
    text(image, 82, 37, 'Inventora', 22, INK, 600)
    text(image, 1236, 42, 'Ilustrasi antarmuka · data contoh', 13, MUTED, align='right')
    text(image, 56, 93, title, 28, INK, 600)
    text(image, 1230, 103, subtitle, 14, MUTED, align='right')
    box(image, (44, 151, 1236, 653), WHITE, BORDER, 14)
    line(image, [(236, 151), (236, 653)])
    for i, label in enumerate(['Ringkasan', 'Inventori', 'Purchase order', 'POS']):
        y = 190+i*56
        if label == selected:
            box(image, (60, y-10, 220, y+31), SOFT, SOFT, 6)
        text(image, 76, y, label, 15, BLUE if label == selected else MUTED, 600 if label == selected else 400)
    text(image, 76, 590, 'Ruang kerja', 12, MUTED)
    text(image, 76, 612, 'Inventora', 14, INK, 500)
    text(image, 56, 680, 'Persediaan · Pengadaan · Penjualan', 13, MUTED)
    return image


@lru_cache(None)
def inventory():
    image = shell('Lihat barang dengan jelas', 'Inventori', 'Contoh persediaan')
    text(image, 266, 180, 'Inventori', 22, weight=600)
    box(image, (266, 222, 806, 264), '#f6f8fb')
    text(image, 282, 235, 'Cari nama barang atau SKU', 14, MUTED)
    for x, label in [(282, 'Barang / SKU'), (900, 'Stok'), (1050, 'Status')]:
        text(image, x, 294, label, 14, MUTED, 500)
    rows = [('Enterprise WiFi 6E Access Point', 'AP-WIFI-6E', '24', 'Tersedia'),
            ('8TB NVMe Enterprise Storage', 'STR-NVME-8TB', '8', 'Perlu ditinjau'),
            ('10GbE Network L3 Managed Switch', 'SW-10GBE-L3', '86', 'Tersedia')]
    for index, (name, sku, stock, status) in enumerate(rows):
        y = 337+index*84
        line(image, [(266, y-13), (1208, y-13)])
        text(image, 282, y, name, 17, weight=500)
        text(image, 282, y+29, sku, 13, MUTED)
        text(image, 922, y+7, stock, 20, align='right')
        tag(image, 1040, y+4, status, GREEN if index != 1 else '#925b11', '#e8f4ee' if index != 1 else '#fff4df')
    return image


@lru_cache(None)
def purchase(approved=False):
    image = shell('Periksa rincian sebelum menyetujui', 'Purchase order', 'Contoh pengadaan')
    text(image, 268, 180, 'PO-DEMO-001', 22, weight=600)
    tag(image, 1010, 178, 'Disetujui' if approved else 'Pending approval', GREEN if approved else '#925b11', '#e8f4ee' if approved else '#fff4df')
    text(image, 268, 230, 'Rincian barang', 17, weight=600)
    line(image, [(268, 264), (1208, 264)])
    for x, label in [(284, 'Barang / SKU'), (802, 'Jumlah'), (916, 'Harga satuan'), (1094, 'Subtotal')]:
        text(image, x, 282, label, 13, MUTED, 500)
    text(image, 284, 324, 'Enterprise WiFi 6E Access Point', 17, weight=500)
    text(image, 284, 355, 'AP-WIFI-6E', 13, MUTED)
    text(image, 825, 331, '2', 17)
    text(image, 1035, 331, 'Rp 2.500.000', 16, align='right')
    text(image, 1190, 331, 'Rp 5.000.000', 16, align='right')
    line(image, [(268, 397), (1208, 397)])
    for y, label, amount in [(424, 'Subtotal', 'Rp 5.000.000'), (460, 'PPN simulasi 11%', 'Rp 550.000'), (510, 'Total pesanan', 'Rp 5.550.000')]:
        text(image, 870, y, label, 15, MUTED)
        text(image, 1190, y, amount, 18, INK, 600 if y == 510 else 400, 'right')
    button(image, 1010, 574, 'Disetujui' if approved else 'Setujui PO')
    return image


@lru_cache(None)
def receipt():
    image = shell('Cocokkan barang yang diterima', 'Purchase order', 'Contoh penerimaan · GRN')
    text(image, 268, 180, 'Penerimaan barang', 22, weight=600)
    text(image, 268, 220, 'PO-DEMO-001 · SJ-DEMO-001', 14, MUTED)
    for x, label in [(284, 'Barang / SKU'), (810, 'Dipesan'), (930, 'Diterima'), (1074, 'Kondisi')]:
        text(image, x, 284, label, 14, MUTED, 500)
    line(image, [(268, 317), (1208, 317)])
    text(image, 284, 340, 'Enterprise WiFi 6E Access Point', 17, weight=500)
    text(image, 284, 370, 'AP-WIFI-6E', 13, MUTED)
    text(image, 837, 348, '2', 18)
    box(image, (930, 333, 1010, 378), WHITE)
    text(image, 955, 347, '2', 18)
    tag(image, 1060, 340, 'Baik', GREEN, '#e8f4ee')
    box(image, (268, 436, 1208, 511), '#f2f9f5', '#dcece2')
    check(image, 303, 472)
    text(image, 343, 457, 'Jumlah dan kondisi sesuai', 17, GREEN, 600)
    text(image, 343, 485, 'Penerimaan siap disimpan.', 13, MUTED)
    button(image, 1010, 574, 'Simpan penerimaan')
    return image


@lru_cache(None)
def pos():
    image = shell('Terima pembayaran, simpan penjualan', 'POS', 'Contoh kasir · penyimpanan lokal')
    text(image, 268, 180, 'Kasir penjualan', 22, weight=600)
    box(image, (268, 227, 715, 270), '#f6f8fb')
    text(image, 283, 241, 'Cari nama atau SKU', 14, MUTED)
    box(image, (268, 291, 715, 390), WHITE)
    text(image, 284, 309, 'Enterprise WiFi 6E Access Point', 17, weight=500)
    text(image, 284, 340, 'AP-WIFI-6E · Stok 24', 13, MUTED)
    text(image, 686, 325, '+', 27, BLUE, align='right')
    box(image, (755, 227, 1208, 620), WHITE)
    text(image, 776, 248, 'Keranjang penjualan', 18, weight=600)
    text(image, 1188, 251, '1 SKU', 13, MUTED, align='right')
    text(image, 776, 299, 'Enterprise WiFi 6E Access Point', 16, weight=500)
    text(image, 776, 329, '1 × Rp 3.000.000', 14, MUTED)
    line(image, [(776, 378), (1188, 378)])
    for y, label, amount in [(399, 'Total', 'Rp 3.000.000'), (451, 'Tunai diterima', 'Rp 3.500.000'), (503, 'Kembalian', 'Rp 500.000')]:
        text(image, 776, y, label, 15, MUTED)
        text(image, 1188, y, amount, 17, INK, 600 if y == 399 else 400, 'right')
    button(image, 776, 558, 'Selesaikan penjualan', 412)
    text(image, 268, 440, 'Data lokal di browser ini', 14, MUTED)
    text(image, 268, 468, 'Belum disinkronkan ke Firestore.', 13, MUTED)
    return image


def paid(time):
    image = pos().copy()
    image.alpha_composite(Image.new('RGBA', image.size, (12, 24, 40, 72)))
    panel = Image.new('RGBA', image.size)
    box(panel, (420, 202, 1040, 588), WHITE, BORDER, 12)
    check(panel, 470, 251, ease(time/.32))
    text(panel, 511, 234, 'Penjualan tersimpan', 23, weight=600)
    text(panel, 511, 272, 'Stok diperbarui di browser ini.', 14, MUTED)
    line(panel, [(450, 322), (1010, 322)])
    text(panel, 450, 348, 'Struk penjualan', 17, weight=500)
    text(panel, 450, 390, 'Total', 15, MUTED)
    text(panel, 1010, 390, 'Rp 3.000.000', 22, weight=600, align='right')
    text(panel, 450, 443, 'Kembalian', 15, MUTED)
    text(panel, 1010, 443, 'Rp 500.000', 18, align='right')
    button(panel, 802, 514, 'Unduh PDF')
    image.alpha_composite(panel)
    return image


def intro(time, end=False):
    image = Image.new('RGBA', (W, H), BG)
    mark(image, 568, 204, 144, time if not end else 10)
    d = ImageDraw.Draw(image)
    for points in [[(528, 226), (528, 188), (566, 188)], [(714, 366), (752, 366), (752, 328)]]:
        d.line(points, fill='#bcc6d2', width=1)
    p = ease((time-.28)/.36)
    layer = Image.new('RGBA', image.size)
    text(layer, 640, 400+round(9*(1-p)), 'Inventora', 56, INK, 600, 'center')
    text(layer, 640, 485, 'Persediaan, pengadaan, dan penjualan.', 20, MUTED, align='center')
    layer.putalpha(layer.getchannel('A').point(lambda a: round(a*p)))
    image.alpha_composite(layer)
    d.line((594, 376, 594+round(92*ease((time-.28)/.5)), 376), fill=BLUE, width=2)
    text(image, 640, 657, 'Ilustrasi alur · data contoh' if not end else 'Referensi gerak: 24fps.dev/video-editor', 13, MUTED, align='center')
    return image


SCENES = [(0, 3.5), (3.5, 8), (8, 12.5), (12.5, 16.5), (16.5, 22.5), (22.5, 26)]


def scene(index, local):
    if index == 0: return intro(local)
    if index == 1: return inventory().copy()
    if index == 2: return purchase(local > 2.7).copy()
    if index == 3: return receipt().copy()
    if index == 4: return paid(local-3.1) if local > 3.1 else pos().copy()
    return intro(10, end=True)


def frame(time):
    index = next(i for i, (start, end) in enumerate(SCENES) if start <= time < end)
    local = time-SCENES[index][0]
    current = scene(index, local)
    # Adapted slide-over-left structure: incoming scene covers a stationary outgoing scene.
    if index > 0 and local < .45:
        previous = scene(index-1, SCENES[index-1][1]-SCENES[index-1][0]-.001)
        p = clamp(local/.45)
        p = p*p*(3-2*p)
        previous.alpha_composite(current, (round(W*(1-p)), 0))
        current = previous
    return current.convert('RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    output = ROOT / 'inventora-motion-demo.mp4'
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(FPS*SECONDS):
            process.stdin.write(frame(index/FPS).tobytes())
    finally:
        process.stdin.close()
        code = process.wait()
    if code:
        raise SystemExit(code)
    samples = [(.7, 'Logo'), (5.5, 'Inventori'), (11.5, 'Purchase order'), (15, 'Penerimaan'), (21, 'POS'), (24, 'Penutup')]
    contact = Image.new('RGB', (960, 600), '#ffffff')
    for i, (time, label) in enumerate(samples):
        thumbnail = frame(time).resize((480, 270), Image.Resampling.LANCZOS)
        x, y = (i%2)*480, (i//2)*200
        # 16:9 previews at 320x180 leave room for scene labels.
        thumbnail = thumbnail.resize((320, 180), Image.Resampling.LANCZOS)
        contact.paste(thumbnail, (x+80, y))
        ImageDraw.Draw(contact).text((x+80, y+183), label, fill=INK, font=font(12))
    contact.save(ROOT / 'storyboard.png')
    print(f'{output} | {W}x{H}, {FPS} fps, {SECONDS} seconds, {output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
