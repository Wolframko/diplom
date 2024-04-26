import { FC, useState, useRef } from "react";
import Input from "./ui/Input";
import { BiCheck, BiSend } from "react-icons/bi";
import { FiEdit2 } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import "emoji-mart/";

interface NewMessageInputFormProps {
  value: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  messageToEdit: Message | null;
  setMessageToEdit: React.Dispatch<React.SetStateAction<Message | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
}

const NewMessageInputForm: FC<NewMessageInputFormProps> = ({
  value,
  onSubmit,
  onChange,
  messageToEdit,
  setMessageToEdit,
  inputRef,
}) => {
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const isEditing = messageToEdit !== null;

  const handleEmojiSelect = (emoji: any) => {
    const start = inputRef.current?.selectionStart || 0;
    const end = inputRef.current?.selectionEnd || 0;
    const newValue = inputValue.slice(0, start) + emoji.native + inputValue.slice(end);
    setInputValue(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e);
  };

  return (
    <form
      onSubmit={(e) => {
        onSubmit(e);
        setInputValue(""); // Reset input after submission
      }}
      className="absolute bottom-0 w-full h-20 px-5 flex items-center gap-2"
    >
      <div className="w-full relative">
        {isEditing && (
          <div className="absolute top-1/2 -translate-y-1/2 pl-3 text-blue-600 flex items-center gap-2 border-r-[1px] pr-2 border-blue-600">
            <FiEdit2 />
            <p className="text-sm">Editing</p>
          </div>
        )}
        <Input
          type="text"
          size="lg"
          placeholder="Введите сообщение..."
          value={inputValue}
          onChange={handleChange}
          className={`${
            isEditing ? "pl-24 outline outline-2 outline-blue-600" : ""
          }`}
          ref={inputRef}
        />
      </div>

      <button
        type="button"
        onClick={() => setEmojiPickerVisible(!isEmojiPickerVisible)}
        className="bg-neutral-200 rounded-full h-12 aspect-square flex items-center justify-center p-2.5 text-neutral-600 dark:bg-neutral-800"
      >
        😀
      </button>

      {isEmojiPickerVisible && (
        <div className="absolute bottom-20">
          <Picker data={data} locale="ru" onEmojiSelect={handleEmojiSelect} />
        </div>
      )}

      {isEditing && (
        <button
          type="button"
          onClick={() => setMessageToEdit(null)}
          className={`bg-neutral-200 rounded-full h-12 aspect-square flex items-center justify-center p-2.5 text-neutral-600 dark:bg-neutral-800}`}
        >
          <IoClose size={"100%"} />
        </button>
      )}
      <button
        type="submit"
        className={`bg-neutral-200 rounded-full h-12 aspect-square flex items-center justify-center p-2.5 ${
          inputValue.trim() === ""
            ? "text-neutral-400 cursor-default"
            : "text-blue-600"
        } dark:bg-neutral-800`}
      >
        {isEditing ? <BiCheck size={"100%"} /> : <BiSend size={"100%"} />}
      </button>
    </form>
  );
};

export default NewMessageInputForm;
