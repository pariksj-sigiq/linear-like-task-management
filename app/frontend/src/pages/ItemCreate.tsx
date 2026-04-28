import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormLayout, FormField, TextInput, TextAreaInput } from "@shared/FormLayout";
import { callTool } from "../api";

export function ItemCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const obs = await callTool("create_item", {
      name,
      description: description || undefined,
      owner: owner || undefined,
    });
    if (!obs.is_error && obs.structured_content?.id) {
      navigate(`/items/${obs.structured_content.id}`);
    }
    setSubmitting(false);
  };

  return (
    <FormLayout
      title="New Item"
      onSubmit={handleSubmit}
      onCancel={() => navigate("/items")}
      submitLabel={submitting ? "Creating..." : "Create Item"}
    >
      <FormField label="Name" required>
        <TextInput value={name} onChange={setName} placeholder="Enter item name" required testId="input-name" />
      </FormField>
      <FormField label="Description">
        <TextAreaInput value={description} onChange={setDescription} placeholder="Enter description" testId="input-description" />
      </FormField>
      <FormField label="Owner">
        <TextInput value={owner} onChange={setOwner} placeholder="e.g. jane.doe" testId="input-owner" />
      </FormField>
    </FormLayout>
  );
}
