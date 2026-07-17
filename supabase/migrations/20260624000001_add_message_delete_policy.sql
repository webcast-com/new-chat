CREATE POLICY "Users can delete their messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
