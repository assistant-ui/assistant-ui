import { AssistantModal } from "@assistant-ui/react";

export const ModalChat = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <AssistantModal />
      <p className="bold text-lg">
        The Assistant Modal is available in the bottom right corner of the
        screen.
      </p>
    </div>
  );
};
