# File: users/serializers.py
# (File BARU)

from django.contrib.auth.models import User, Group
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer untuk registrasi user baru (dibuat oleh Admin).
    """
    # Bikin field email jadi WAJIB
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())] # Pastiin email unik
    )

    # Bikin 2 field password (konfirmasi)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    # Field baru untuk milih "Departemen" (Grup)
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        many=True,
        required=False # Bikin opsional dulu
    )

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name', 'groups')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        """
        Validasi kustom untuk cek password2.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password 1 dan Password 2 tidak cocok."})
        return attrs

    def create(self, validated_data):
        """
        Bikin user baru kalo validasi lolos.
        """
        # Ambil data "Departemen" (Grup)
        groups_data = validated_data.pop('groups', None)

        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )

        user.set_password(validated_data['password']) # Hash password-nya!
        user.save()

        # Masukin user ke "Departemen" (Grup)
        if groups_data:
            user.groups.set(groups_data)

        return user
    
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer "Kunci" Kustom.
    Ini nambahin data 'groups' (Departemen) ke dalem token.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # --- "Sihir" Departemen (Grup) ---
        # Ambil daftar nama grup (departemen) si user
        group_names = list(user.groups.values_list('name', flat=True))

        # Tambahin data kustom ke "kunci" (token)
        token['username'] = user.username
        token['email'] = user.email
        token['groups'] = group_names # <-- INI DIA!
        # --- Batas Sihir ---

        return token