import Tesseract from 'tesseract.js'
import { parseText, type ParseResult } from './docxParser'

export async function parseImageFile(file: File): Promise<ParseResult> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'eng+chi_sim')
    return parseText(data.text)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}
