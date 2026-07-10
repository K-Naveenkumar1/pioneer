import { NextResponse } from "next/server"
import { Document, Packer, Paragraph, TextRun } from "docx"

export async function GET() {
    try {
        const questionsText = [
            "1. What is the capital of France?",
            "A) Berlin",
            "B) London",
            "C) Paris",
            "D) Rome",
            "Answer: C",
            "",
            "2. Which programming language is known as the language of the web?",
            "A) Python",
            "B) C++",
            "C) JavaScript",
            "D) Java",
            "Answer: C",
            "",
            "3. What is the default port number of a MySQL / TiDB server?",
            "A) 80",
            "B) 443",
            "C) 3306",
            "D) 8080",
            "Answer: C",
            "",
            "4. In Next.js, which directory is used for the App Router?",
            "A) pages",
            "B) src/app",
            "C) public",
            "D) components",
            "Answer: B",
            "",
            "5. What does HTML stand for?",
            "A) Hyper Text Markup Language",
            "B) High Text Markup Language",
            "C) Hyper Tabular Markup Language",
            "D) None of the above",
            "Answer: A"
        ]

        const children = questionsText.map(line => {
            return new Paragraph({
                children: [
                    new TextRun({
                        text: line,
                        size: 24, // 12pt
                        font: "Calibri"
                    })
                ],
                spacing: { after: 100 }
            })
        })

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "PIONEER MCQ EXAM - SAMPLE QUESTION BANK",
                                    bold: true,
                                    size: 32, // 16pt
                                    font: "Calibri"
                                })
                            ],
                            spacing: { after: 300 }
                        }),
                        ...children
                    ]
                }
            ]
        })

        const buffer = await Packer.toBuffer(doc)

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": "attachment; filename=sample-mcq.docx"
            }
        })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
