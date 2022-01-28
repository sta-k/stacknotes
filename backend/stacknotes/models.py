from django.db import models

class ExtensionSettings(models.Model):
    extension_id = models.CharField(max_length=255, null=True)
    mute_emails = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extension_settings'



class Items(models.Model):
    content = models.TextField(null=True)
    content_type = models.CharField(max_length=255, null=True)
    enc_item_key = models.TextField(null=True)
    auth_hash = models.CharField(max_length=255, null=True)
    user_uuid = models.CharField(max_length=255, null=True)
    deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    last_user_agent = models.TextField(null=True)

    class Meta:
        db_table = 'items'


class NoteUsers(models.Model):
    email = models.CharField(max_length=255, null=True)
    pw_func = models.CharField(max_length=255, null=True)
    pw_alg = models.CharField(max_length=255, null=True)
    pw_cost = models.IntegerField(null=True)
    pw_key_size = models.IntegerField(null=True)
    pw_nonce = models.CharField(max_length=255, null=True)
    encrypted_password = models.CharField(max_length=255)
    reated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)	
    pw_salt = models.CharField(max_length=255, null=True)
    version = models.CharField(max_length=255, null=True)
    updated_with_user_agent = models.TextField(null=True)
    locked_until = models.DateTimeField(null=True)
    num_failed_attempts = models.IntegerField(null=True)

    class Meta:
        db_table = 'users'


"""

select extension_settings
select items
select users


#################################################################################
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "extension_settings", primary_key: "uuid", id: :string, limit: 36, force: :cascade do |t|
    t.string "extension_id"
    t.boolean "mute_emails", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["extension_id"], name: "index_extension_settings_on_extension_id"
  end


uuid	character varying(36)	
extension_id	character varying NULL	
mute_emails	boolean NULL [false]	
created_at	timestamp	
updated_at	timestamp


#################################################################################

  create_table "items", primary_key: "uuid", id: :string, limit: 36, force: :cascade do |t|
    t.text "content"
    t.string "content_type"
    t.text "enc_item_key"
    t.string "auth_hash"
    t.string "user_uuid"
    t.boolean "deleted", default: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.text "last_user_agent"
    t.index ["content_type"], name: "index_items_on_content_type"
    t.index ["updated_at"], name: "index_items_on_updated_at"
    t.index ["user_uuid", "content_type"], name: "index_items_on_user_uuid_and_content_type"
    t.index ["user_uuid"], name: "index_items_on_user_uuid"
  end


  uuid	character varying(36)	
content	text NULL	
content_type	character varying NULL	
enc_item_key	text NULL	
auth_hash	character varying NULL	
user_uuid	character varying NULL	
deleted	boolean NULL [false]	
created_at	timestamp(6)	
updated_at	timestamp(6)	
last_user_agent	text NULL

#################################################################################

  create_table "users", primary_key: "uuid", id: :string, limit: 36, force: :cascade do |t|
    t.string "email"
    t.string "pw_func"
    t.string "pw_alg"
    t.integer "pw_cost"
    t.integer "pw_key_size"
    t.string "pw_nonce"
    t.string "encrypted_password", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "pw_salt"
    t.string "version"
    t.text "updated_with_user_agent"
    t.datetime "locked_until"
    t.integer "num_failed_attempts"
    t.index ["email"], name: "index_users_on_email"
  end

end

uuid	character varying(36)	
email	character varying NULL	
pw_func	character varying NULL	
pw_alg	character varying NULL	
pw_cost	integer NULL	
pw_key_size	integer NULL	
pw_nonce	character varying NULL	
encrypted_password	character varying []	
created_at	timestamp	
updated_at	timestamp	
pw_salt	character varying NULL	
version	character varying NULL	
updated_with_user_agent	text NULL	
locked_until	timestamp NULL	
num_failed_attempts	integer NULL
"""