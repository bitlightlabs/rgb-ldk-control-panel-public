import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useRef, useState } from "react";

interface IProps {
  count: number
  onComplete: (words: string[]) => void
}
export default function WordForm({ count, onComplete }: IProps) {
  const [words, setWords] = useState<string[]>(new Array(count).fill(''))

  const pasteHandler = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      e.preventDefault()
      const text = await readText();
      if(text) {
        const arr = text.trim().split(" ").filter(Boolean)
        setWords(arr)
        if(arr.length === count) {
          onComplete(arr)
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  const changeWord = (index: number, value: string) => {
    const newWords = [...words]
    newWords[index] = value.trim()
    setWords(newWords)

    if(newWords.filter(Boolean).length === count) {
      onComplete(newWords)
    }
  }

  useEffect(() => {
    setWords(new Array(count).fill(''))
  }, [count])

  return (
    <div className="grid grid-cols-3 gap-4">
      {
        Array.from({ length: count }).map((_, index) => {
          return (
            <Field key={index}>
              <PasswordInput
                autoComplete="off"
                value={words[index] || ''}
                className="h-10 bg-background-3"
                prefix={index + 1}
                onChange={(e) => changeWord(index, e.target.value)}
                onPaste={pasteHandler}
              />
            </Field>
          )
        })
      }
    </div>
  )
}
