import os

# fix html-to-pdf
path = 'src/app/api/html-to-pdf/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("waitUntil: 'networkidle2'", "waitUntil: 'networkidle2' as any")
content = content.replace("new NextResponse(pdfBytes", "new NextResponse(pdfBytes as any")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# fix word-to-pdf
path = 'src/app/api/word-to-pdf/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("waitUntil: 'networkidle0'", "waitUntil: 'networkidle0' as any")
content = content.replace("new NextResponse(pdfBytes", "new NextResponse(pdfBytes as any")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# fix pptx-to-pdf
path = 'src/app/api/pptx-to-pdf/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("new NextResponse(pdfBuf", "new NextResponse(pdfBuf as any")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed api route TS errors")
