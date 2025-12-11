export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          chat_message_id: string | null
          comment_id: string | null
          created_at: string
          document_id: string | null
          filename: string
          filetype: string
          id: string
          requisition_id: string | null
          size_bytes: number | null
          storage_path: string
          uploader_id: string
        }
        Insert: {
          chat_message_id?: string | null
          comment_id?: string | null
          created_at?: string
          document_id?: string | null
          filename: string
          filetype: string
          id?: string
          requisition_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploader_id: string
        }
        Update: {
          chat_message_id?: string | null
          comment_id?: string | null
          created_at?: string
          document_id?: string | null
          filename?: string
          filetype?: string
          id?: string
          requisition_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          created_at: string
          head_id: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          head_id: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          head_id?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_units_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          created_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: Database["public"]["Enums"]["chat_type"]
          created_at: string
          creator_id: string | null
          group_image_url: string | null
          group_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          chat_type: Database["public"]["Enums"]["chat_type"]
          created_at?: string
          creator_id?: string | null
          group_image_url?: string | null
          group_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          chat_type?: Database["public"]["Enums"]["chat_type"]
          created_at?: string
          creator_id?: string | null
          group_image_url?: string | null
          group_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          author_id: string
          content: string
          created_at: string
          document_id: string | null
          id: string
          parent_comment_id: string | null
          requisition_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          author_id: string
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          parent_comment_id?: string | null
          requisition_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          author_id?: string
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          parent_comment_id?: string | null
          requisition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_history: {
        Row: {
          action: Database["public"]["Enums"]["document_action"]
          actor_id: string
          comments: string | null
          created_at: string
          document_id: string
          from_step_id: string | null
          id: string
          to_step_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["document_action"]
          actor_id: string
          comments?: string | null
          created_at?: string
          document_id: string
          from_step_id?: string | null
          id?: string
          to_step_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["document_action"]
          actor_id?: string
          comments?: string | null
          created_at?: string
          document_id?: string
          from_step_id?: string | null
          id?: string
          to_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_history_from_step_id_fkey"
            columns: ["from_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_history_to_step_id_fkey"
            columns: ["to_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          assigned_at: string
          assigned_by_id: string
          document_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_id: string
          document_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_id?: string
          document_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          business_unit_id: string
          created_at: string
          current_step_id: string | null
          data: Json
          form_template_id: string
          id: string
          initiator_id: string
          organization_id: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          current_step_id?: string | null
          data: Json
          form_template_id: string
          id?: string
          initiator_id: string
          organization_id: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          current_step_id?: string | null
          data?: Json
          form_template_id?: string
          id?: string
          initiator_id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_options: {
        Row: {
          field_id: string
          id: string
          label: string
          order: number
          value: string
        }
        Insert: {
          field_id: string
          id?: string
          label: string
          order: number
          value: string
        }
        Update: {
          field_id?: string
          id?: string
          label?: string
          order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "template_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          id: string
          is_required: boolean
          label: string
          name: string
          options: Json | null
          order: number
          placeholder: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          id?: string
          is_required?: boolean
          label: string
          name: string
          options?: Json | null
          order: number
          placeholder?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["form_field_type"]
          id?: string
          is_required?: boolean
          label?: string
          name?: string
          options?: Json | null
          order?: number
          placeholder?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_latest: boolean
          is_locked: boolean
          name: string
          organization_id: string
          parent_template_id: string | null
          updated_at: string
          version: number
          workflow_template_id: string | null
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean
          is_locked?: boolean
          name: string
          organization_id: string
          parent_template_id?: string | null
          updated_at?: string
          version?: number
          workflow_template_id?: string | null
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean
          is_locked?: boolean
          name?: string
          organization_id?: string
          parent_template_id?: string | null
          updated_at?: string
          version?: number
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          recipient_id: string
          requisition_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          recipient_id: string
          requisition_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          recipient_id?: string
          requisition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          message: string | null
          organization_id: string
          responded_at: string | null
          send_email: boolean
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          message?: string | null
          organization_id: string
          responded_at?: string | null
          send_email?: boolean
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          message?: string | null
          organization_id?: string
          responded_at?: string | null
          send_email?: boolean
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          image_url: string | null
          last_name: string | null
          middle_name: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          image_url?: string | null
          last_name?: string | null
          middle_name?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          middle_name?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_approvals: {
        Row: {
          actioned_at: string | null
          approver_id: string | null
          created_at: string
          id: string
          requisition_id: string
          status: Database["public"]["Enums"]["approval_status"]
          step_definition_id: string
          updated_at: string | null
        }
        Insert: {
          actioned_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          requisition_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_definition_id: string
          updated_at?: string | null
        }
        Update: {
          actioned_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          requisition_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_definition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisition_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_approvals_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_tags: {
        Row: {
          assigned_at: string
          assigned_by_id: string
          requisition_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_id: string
          requisition_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_id?: string
          requisition_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_tags_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_tags_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_templates: {
        Row: {
          approval_workflow_id: string | null
          business_unit_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_latest: boolean
          name: string
          parent_template_id: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string | null
          version: number
        }
        Insert: {
          approval_workflow_id?: string | null
          business_unit_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_latest?: boolean
          name: string
          parent_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string | null
          version?: number
        }
        Update: {
          approval_workflow_id?: string | null
          business_unit_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_latest?: boolean
          name?: string
          parent_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisition_templates_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_values: {
        Row: {
          id: string
          requisition_id: string
          row_index: number | null
          template_field_id: string
          value: string
        }
        Insert: {
          id?: string
          requisition_id: string
          row_index?: number | null
          template_field_id: string
          value: string
        }
        Update: {
          id?: string
          requisition_id?: string
          row_index?: number | null
          template_field_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_values_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_values_template_field_id_fkey"
            columns: ["template_field_id"]
            isOneToOne: false
            referencedRelation: "template_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          business_unit_id: string
          created_at: string
          id: string
          initiator_id: string
          overall_status: Database["public"]["Enums"]["requisition_status"]
          template_id: string
          triggered_by_requisition_id: string | null
          updated_at: string | null
          workflow_chain_id: string | null
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          id?: string
          initiator_id: string
          overall_status?: Database["public"]["Enums"]["requisition_status"]
          template_id: string
          triggered_by_requisition_id?: string | null
          updated_at?: string | null
          workflow_chain_id?: string | null
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          id?: string
          initiator_id?: string
          overall_status?: Database["public"]["Enums"]["requisition_status"]
          template_id?: string
          triggered_by_requisition_id?: string | null
          updated_at?: string | null
          workflow_chain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_triggered_by_requisition_id_fkey"
            columns: ["triggered_by_requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          business_unit_id: string | null
          created_at: string
          id: string
          is_bu_admin: boolean
          name: string
          scope: Database["public"]["Enums"]["role_scope"]
          updated_at: string | null
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          id?: string
          is_bu_admin?: boolean
          name: string
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string | null
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          id?: string
          is_bu_admin?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          creator_id: string
          id: string
          label: string
        }
        Insert: {
          color?: string
          created_at?: string
          creator_id: string
          id?: string
          label: string
        }
        Update: {
          color?: string
          created_at?: string
          creator_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          field_config: Json | null
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          is_required: boolean
          label: string
          order: number
          parent_list_field_id: string | null
          placeholder: string | null
          template_id: string
        }
        Insert: {
          field_config?: Json | null
          field_type: Database["public"]["Enums"]["field_type"]
          id?: string
          is_required?: boolean
          label: string
          order: number
          parent_list_field_id?: string | null
          placeholder?: string | null
          template_id: string
        }
        Update: {
          field_config?: Json | null
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          is_required?: boolean
          label?: string
          order?: number
          parent_list_field_id?: string | null
          placeholder?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_parent_list_field_id_fkey"
            columns: ["parent_list_field_id"]
            isOneToOne: false
            referencedRelation: "template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_initiator_access: {
        Row: {
          role_id: string
          template_id: string
        }
        Insert: {
          role_id: string
          template_id: string
        }
        Update: {
          role_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_initiator_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_initiator_access_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_units: {
        Row: {
          business_unit_id: string
          membership_type: Database["public"]["Enums"]["bu_membership_type"]
          user_id: string
        }
        Insert: {
          business_unit_id: string
          membership_type?: Database["public"]["Enums"]["bu_membership_type"]
          user_id: string
        }
        Update: {
          business_unit_id?: string
          membership_type?: Database["public"]["Enums"]["bu_membership_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_business_units_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_business_units_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_chains: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_latest: boolean
          name: string
          parent_chain_id: string | null
          status: Database["public"]["Enums"]["approval_workflow_status"]
          updated_at: string
          version: number
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean
          name: string
          parent_chain_id?: string | null
          status?: Database["public"]["Enums"]["approval_workflow_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean
          name?: string
          parent_chain_id?: string | null
          status?: Database["public"]["Enums"]["approval_workflow_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_chains_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_chains_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_chains_parent_chain_id_fkey"
            columns: ["parent_chain_id"]
            isOneToOne: false
            referencedRelation: "workflow_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_section_initiators: {
        Row: {
          created_at: string
          id: string
          role_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_section_initiators_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_section_initiators_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workflow_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_section_steps: {
        Row: {
          approver_role_id: string
          created_at: string
          id: string
          section_id: string
          step_number: number
        }
        Insert: {
          approver_role_id: string
          created_at?: string
          id?: string
          section_id: string
          step_number: number
        }
        Update: {
          approver_role_id?: string
          created_at?: string
          id?: string
          section_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_section_steps_approver_role_id_fkey"
            columns: ["approver_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_section_steps_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workflow_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_sections: {
        Row: {
          auto_trigger: boolean | null
          chain_id: string
          created_at: string
          form_template_id: string | null
          id: string
          initiator_role_id: string | null
          initiator_type: string | null
          section_description: string | null
          section_name: string
          section_order: number
          target_template_id: string | null
          trigger_condition: string | null
          updated_at: string
        }
        Insert: {
          auto_trigger?: boolean | null
          chain_id: string
          created_at?: string
          form_template_id?: string | null
          id?: string
          initiator_role_id?: string | null
          initiator_type?: string | null
          section_description?: string | null
          section_name: string
          section_order: number
          target_template_id?: string | null
          trigger_condition?: string | null
          updated_at?: string
        }
        Update: {
          auto_trigger?: boolean | null
          chain_id?: string
          created_at?: string
          form_template_id?: string | null
          id?: string
          initiator_role_id?: string | null
          initiator_type?: string | null
          section_description?: string | null
          section_name?: string
          section_order?: number
          target_template_id?: string | null
          trigger_condition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_sections_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "workflow_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_sections_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_sections_initiator_role_id_fkey"
            columns: ["initiator_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_sections_target_template_id_fkey"
            columns: ["target_template_id"]
            isOneToOne: false
            referencedRelation: "requisition_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          approver_role_id: string
          created_at: string
          id: string
          name: string
          step_number: number
          workflow_template_id: string
        }
        Insert: {
          approver_role_id: string
          created_at?: string
          id?: string
          name: string
          step_number: number
          workflow_template_id: string
        }
        Update: {
          approver_role_id?: string
          created_at?: string
          id?: string
          name?: string
          step_number?: number
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_approver_role_id_fkey"
            columns: ["approver_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_locked: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_document_comment: {
        Args: {
          p_content: string
          p_document_id: string
          p_parent_comment_id?: string
        }
        Returns: undefined
      }
      archive_workflow_chain: { Args: { p_chain_id: string }; Returns: boolean }
      can_delete_role_assignment: {
        Args: { assignment_role_id: string; assignment_user_id: string }
        Returns: boolean
      }
      can_manage_workflows_for_bu: {
        Args: { p_bu_id: string }
        Returns: boolean
      }
      can_view_role_assignment: {
        Args: { assignment_user_id: string }
        Returns: boolean
      }
      check_workflow_chain_circular: {
        Args: { p_source_workflow_id: string; p_target_workflow_id: string }
        Returns: boolean
      }
      check_workflow_in_use: { Args: { p_workflow_id: string }; Returns: Json }
      create_new_template_version: {
        Args: {
          business_unit_id: string
          new_description: string
          new_name: string
          new_version_number: number
          old_template_id: string
          parent_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_document_id?: string
          p_link_url?: string
          p_message: string
          p_recipient_id: string
        }
        Returns: undefined
      }
      delete_workflow_chain: { Args: { p_chain_id: string }; Returns: boolean }
      delete_workflow_chain_transitions: {
        Args: { p_workflow_ids: string[] }
        Returns: undefined
      }
      delete_workflow_transition: {
        Args: { p_business_unit_id?: string; p_transition_id: string }
        Returns: Json
      }
      get_administered_bu_ids: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      get_approved_documents_for_bu: {
        Args: never
        Returns: {
          business_unit_id: string
          created_at: string
          current_step_id: string | null
          data: Json
          form_template_id: string
          id: string
          initiator_id: string
          organization_id: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_approvers_for_step: {
        Args: { p_step_id: string }
        Returns: {
          approver_id: string
        }[]
      }
      get_auditor_document_details: {
        Args: { p_document_id: string }
        Returns: Json
      }
      get_auditor_documents: {
        Args: {
          p_search_text?: string
          p_status_filter?: Database["public"]["Enums"]["document_status"]
          p_tag_ids?: string[]
        }
        Returns: {
          business_unit_id: string
          business_unit_name: string
          created_at: string
          id: string
          initiator_email: string
          initiator_id: string
          initiator_name: string
          organization_id: string
          organization_name: string
          status: Database["public"]["Enums"]["document_status"]
          tags: Json
          template_id: string
          template_name: string
          updated_at: string
        }[]
      }
      get_available_target_workflows: {
        Args: { p_business_unit_id: string; p_source_workflow_id: string }
        Returns: {
          approval_steps: Json
          form_id: string
          form_name: string
          initiator_roles: Json
          workflow_description: string
          workflow_id: string
          workflow_name: string
          workflow_status: string
          would_create_circular: boolean
        }[]
      }
      get_business_unit_options: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_business_units_for_user: {
        Args: never
        Returns: {
          created_at: string
          head_email: string
          head_first_name: string
          head_id: string
          head_last_name: string
          id: string
          name: string
          organization_id: string
        }[]
      }
      get_document_comments: {
        Args: { p_document_id: string }
        Returns: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string
        }[]
      }
      get_document_details: { Args: { p_document_id: string }; Returns: Json }
      get_form_template_by_id: {
        Args: { p_template_id: string }
        Returns: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_latest: boolean
          is_locked: boolean
          name: string
          organization_id: string
          parent_template_id: string | null
          updated_at: string
          version: number
          workflow_template_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "form_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_form_template_with_fields: {
        Args: { p_template_id: string }
        Returns: Json
      }
      get_form_templates_for_user: {
        Args: never
        Returns: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_latest: boolean
          is_locked: boolean
          name: string
          organization_id: string
          parent_template_id: string | null
          updated_at: string
          version: number
          workflow_template_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "form_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_initiated_documents: {
        Args: never
        Returns: {
          business_unit_id: string
          created_at: string
          current_step_id: string | null
          data: Json
          form_template_id: string
          id: string
          initiator_id: string
          organization_id: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          document_id: string
          id: string
          is_read: boolean
          link_url: string
          message: string
        }[]
      }
      get_my_organization_id: { Args: never; Returns: string }
      get_my_pending_approvals: {
        Args: never
        Returns: {
          business_unit_id: string
          created_at: string
          current_step_id: string | null
          data: Json
          form_template_id: string
          id: string
          initiator_id: string
          organization_id: string
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_org_admin_business_units: {
        Args: never
        Returns: {
          created_at: string
          head_email: string
          head_id: string
          head_name: string
          id: string
          name: string
          user_count: number
        }[]
      }
      get_org_admin_users: {
        Args: never
        Returns: {
          business_units: Json
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          system_roles: string[]
        }[]
      }
      get_requisitions_for_bu: {
        Args: { bu_id: string }
        Returns: {
          business_unit_id: string
          created_at: string
          id: string
          initiator_id: string
          overall_status: string
          template_id: string
        }[]
      }
      get_templates_for_bu: {
        Args: { bu_id: string }
        Returns: {
          business_unit_id: string
          created_at: string
          description: string
          id: string
          is_latest: boolean
          name: string
        }[]
      }
      get_templates_for_transition: {
        Args: { p_business_unit_id: string }
        Returns: {
          has_workflow: boolean
          template_description: string
          template_icon: string
          template_id: string
          template_name: string
        }[]
      }
      get_user_auth_context: { Args: never; Returns: Json }
      get_user_organization_id: { Args: never; Returns: string }
      get_users_in_organization: {
        Args: never
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          organization_id: string
        }[]
      }
      get_workflow_builder_data: {
        Args: { p_business_unit_id: string }
        Returns: Json
      }
      get_workflow_business_unit_id: {
        Args: { p_workflow_id: string }
        Returns: string
      }
      get_workflow_chain_details: {
        Args: { p_chain_id: string }
        Returns: Json
      }
      get_workflow_chains_for_bu: {
        Args: { p_bu_id: string }
        Returns: {
          business_unit_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_latest: boolean
          name: string
          parent_chain_id: string
          section_count: number
          status: Database["public"]["Enums"]["approval_workflow_status"]
          total_steps: number
          updated_at: string
          version: number
        }[]
      }
      get_workflow_template_by_id: {
        Args: { p_template_id: string }
        Returns: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_locked: boolean
          name: string
          organization_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_workflow_templates_for_user: {
        Args: never
        Returns: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_locked: boolean
          name: string
          organization_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_auditor: { Args: never; Returns: boolean }
      is_bu_admin: { Args: never; Returns: boolean }
      is_bu_admin_for_unit: { Args: { bu_id: string }; Returns: boolean }
      is_member_of_bu: { Args: { p_bu_id: string }; Returns: boolean }
      is_organization_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      process_document_action: {
        Args: {
          p_action: Database["public"]["Enums"]["document_action"]
          p_comments: string
          p_document_id: string
        }
        Returns: undefined
      }
      save_workflow_chain: {
        Args: {
          p_business_unit_id: string
          p_chain_id: string
          p_description: string
          p_name: string
          p_sections: Json
        }
        Returns: Json
      }
      submit_document: {
        Args: { p_bu_id: string; p_form_data: Json; p_template_id: string }
        Returns: string
      }
      update_avatar_url: {
        Args: { avatar_url: string; profile_id: string }
        Returns: undefined
      }
      user_is_chat_participant: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_workflow_transition: {
        Args: {
          p_business_unit_id?: string
          p_source_workflow_id: string
          p_target_template_id: string
          p_target_workflow_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      action_type:
        | "SUBMIT"
        | "APPROVE"
        | "REQUEST_REVISION"
        | "REQUEST_CLARIFICATION"
        | "CLARIFY"
        | "RESUBMIT"
        | "COMMENT"
        | "CANCEL"
      approval_status:
        | "WAITING"
        | "PENDING"
        | "APPROVED"
        | "REQUESTED_CLARIFICATION"
        | "REQUESTED_REVISION"
      approval_workflow_status: "draft" | "active" | "archived"
      bu_membership_type: "MEMBER" | "AUDITOR"
      chat_type: "PRIVATE" | "GROUP"
      document_action:
        | "CREATED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "REVISION_REQUESTED"
        | "UPDATED"
        | "COMMENTED"
        | "CANCELLED"
      document_status:
        | "DRAFT"
        | "SUBMITTED"
        | "IN_REVIEW"
        | "NEEDS_REVISION"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLED"
      field_type:
        | "short-text"
        | "long-text"
        | "number"
        | "radio"
        | "checkbox"
        | "table"
        | "file-upload"
        | "repeater"
        | "grid-table"
      form_field_type:
        | "text"
        | "textarea"
        | "number"
        | "select"
        | "multiselect"
        | "checkbox"
        | "radio"
        | "date"
        | "file"
      requisition_status:
        | "DRAFT"
        | "PENDING"
        | "NEEDS_CLARIFICATION"
        | "IN_REVISION"
        | "APPROVED"
        | "CANCELED"
      role_scope: "BU" | "SYSTEM" | "AUDITOR" | "ORGANIZATION"
      template_status: "draft" | "active" | "archived"
      user_status: "UNASSIGNED" | "ACTIVE" | "DISABLED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_type: [
        "SUBMIT",
        "APPROVE",
        "REQUEST_REVISION",
        "REQUEST_CLARIFICATION",
        "CLARIFY",
        "RESUBMIT",
        "COMMENT",
        "CANCEL",
      ],
      approval_status: [
        "WAITING",
        "PENDING",
        "APPROVED",
        "REQUESTED_CLARIFICATION",
        "REQUESTED_REVISION",
      ],
      approval_workflow_status: ["draft", "active", "archived"],
      bu_membership_type: ["MEMBER", "AUDITOR"],
      chat_type: ["PRIVATE", "GROUP"],
      document_action: [
        "CREATED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "REVISION_REQUESTED",
        "UPDATED",
        "COMMENTED",
        "CANCELLED",
      ],
      document_status: [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "NEEDS_REVISION",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],
      field_type: [
        "short-text",
        "long-text",
        "number",
        "radio",
        "checkbox",
        "table",
        "file-upload",
        "repeater",
        "grid-table",
      ],
      form_field_type: [
        "text",
        "textarea",
        "number",
        "select",
        "multiselect",
        "checkbox",
        "radio",
        "date",
        "file",
      ],
      requisition_status: [
        "DRAFT",
        "PENDING",
        "NEEDS_CLARIFICATION",
        "IN_REVISION",
        "APPROVED",
        "CANCELED",
      ],
      role_scope: ["BU", "SYSTEM", "AUDITOR", "ORGANIZATION"],
      template_status: ["draft", "active", "archived"],
      user_status: ["UNASSIGNED", "ACTIVE", "DISABLED"],
    },
  },
} as const
