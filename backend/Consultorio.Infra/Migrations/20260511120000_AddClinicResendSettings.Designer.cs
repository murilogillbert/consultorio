using Consultorio.Infra.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260511120000_AddClinicResendSettings")]
    partial class AddClinicResendSettings
    {
    }
}
